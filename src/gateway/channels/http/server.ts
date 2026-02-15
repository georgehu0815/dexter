import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { randomBytes } from 'crypto';
import type {
  HttpAccountConfig,
  ChatRequest,
  ChatResponse,
  HealthResponse,
  HttpInboundMessage,
} from './types.js';
import { connectionManager } from './connection-manager.js';
import { logger } from '@/utils/logger.js';

/**
 * Create Express server for HTTP channel
 */
export function createHttpServer(
  config: HttpAccountConfig,
  onMessage: (msg: HttpInboundMessage) => Promise<void>
) {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
  }));

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`[HTTP] ${req.method} ${req.path}`);
    next();
  });

  /**
   * Health check endpoint
   */
  app.get('/api/health', (req: Request, res: Response) => {
    const response: HealthResponse = {
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime(),
    };
    res.json(response);
  });

  /**
   * POST /api/chat - Start a new chat session
   *
   * Request body:
   * {
   *   query: string;
   *   userId?: string;
   *   model?: string;
   *   modelProvider?: string;
   * }
   *
   * Response:
   * {
   *   sessionId: string;
   *   streamUrl: string;
   * }
   */
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { query, userId = 'anonymous' }: ChatRequest = req.body;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({ error: 'Query is required and must be a non-empty string' });
        return;
      }

      // Generate unique session ID
      const sessionId = `http-${Date.now()}-${randomBytes(8).toString('hex')}`;

      logger.info(`[HTTP Server] ╔══════════════════════════════════════════╗`);
      logger.info(`[HTTP Server] ║  NEW CHAT REQUEST                        ║`);
      logger.info(`[HTTP Server] ╠══════════════════════════════════════════╣`);
      logger.info(`[HTTP Server] ║  Session: ${sessionId.padEnd(32)} ║`);
      logger.info(`[HTTP Server] ║  User:    ${userId.padEnd(32)} ║`);
      logger.info(`[HTTP Server] ║  Query:   ${query.substring(0, 32).padEnd(32)} ║`);
      logger.info(`[HTTP Server] ╚══════════════════════════════════════════╝`);

      // Return session info immediately
      const response: ChatResponse = {
        sessionId,
        streamUrl: `/api/chat/${sessionId}/stream`,
      };

      res.json(response);
      logger.info(`[HTTP Server] ✅ Response sent to client (session created)`);

      // Start agent processing (async, don't await)
      const inboundMessage: HttpInboundMessage = {
        channel: 'http',
        accountId: config.accountId,
        sessionId,
        userId,
        query,
        timestamp: Date.now(),
      };

      logger.info(`[HTTP Server] 🚀 Dispatching message to gateway handler...`);
      onMessage(inboundMessage).catch((error) => {
        logger.error(`[HTTP Server] ❌ Error in gateway handler for session ${sessionId}:`, error);
      });

    } catch (error) {
      logger.error('[HTTP] Error in POST /api/chat:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/chat/:sessionId/stream - SSE endpoint for agent events
   *
   * Streams AgentEvent objects in real-time as they occur.
   *
   * Event format:
   * event: <event_type>
   * data: <JSON_stringified_AgentEvent>
   */
  app.get('/api/chat/:sessionId/stream', (req: Request, res: Response) => {
    const sessionId = String(req.params.sessionId);
    const userId = (req.query.userId as string) || 'anonymous';

    logger.info(`[HTTP Server] ╔══════════════════════════════════════════╗`);
    logger.info(`[HTTP Server] ║  SSE CONNECTION REQUEST                  ║`);
    logger.info(`[HTTP Server] ╠══════════════════════════════════════════╣`);
    logger.info(`[HTTP Server] ║  Session: ${sessionId.padEnd(32)} ║`);
    logger.info(`[HTTP Server] ║  User:    ${userId.padEnd(32)} ║`);
    logger.info(`[HTTP Server] ╚══════════════════════════════════════════╝`);

    // Add SSE connection
    connectionManager.addConnection(sessionId, userId, res);
    logger.info(`[HTTP Server] ✅ SSE connection established`);

    // Keep-alive ping every 15 seconds
    const keepAliveInterval = setInterval(() => {
      if (connectionManager.hasConnection(sessionId)) {
        res.write(': keep-alive\n\n');
      } else {
        clearInterval(keepAliveInterval);
      }
    }, 15000);

    // Clean up on disconnect
    res.on('close', () => {
      clearInterval(keepAliveInterval);
      connectionManager.removeConnection(sessionId);
      logger.info(`[HTTP Server] 🔌 SSE connection closed for session: ${sessionId}`);
    });
  });

  /**
   * POST /api/chat/:sessionId/cancel - Cancel a running query
   */
  app.post('/api/chat/:sessionId/cancel', async (req: Request, res: Response) => {
    const sessionId = String(req.params.sessionId);

    logger.info(`[HTTP] Cancel request for session: ${sessionId}`);

    if (!connectionManager.hasConnection(sessionId)) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Abort signal is handled by connection manager
    const signal = connectionManager.getAbortSignal(sessionId);
    if (signal) {
      connectionManager.removeConnection(sessionId);
      res.json({ success: true, message: 'Session cancelled' });
    } else {
      res.status(404).json({ error: 'Session not found or already completed' });
    }
  });

  /**
   * GET /api/sessions - List active sessions
   */
  app.get('/api/sessions', (req: Request, res: Response) => {
    const sessions = connectionManager.getSessionIds();
    res.json({
      count: sessions.length,
      sessions,
    });
  });

  /**
   * Error handling middleware
   */
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('[HTTP] Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  });

  return app;
}

/**
 * Start HTTP server
 */
export async function startHttpServer(
  config: HttpAccountConfig,
  onMessage: (msg: HttpInboundMessage) => Promise<void>
): Promise<void> {
  const app = createHttpServer(config, onMessage);

  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(config.port, config.host, () => {
        logger.info(`[HTTP Channel] Server listening on http://${config.host}:${config.port}`);
        logger.info(`[HTTP Channel] CORS origins: ${config.corsOrigins.join(', ')}`);
        resolve();
      });

      server.on('error', (error) => {
        logger.error('[HTTP Channel] Server error:', error);
        reject(error);
      });

      // Cleanup stale connections every 5 minutes
      setInterval(() => {
        const cleaned = connectionManager.cleanStaleConnections();
        if (cleaned > 0) {
          logger.info(`[HTTP Channel] Cleaned ${cleaned} stale connections`);
        }
      }, 300000);

    } catch (error) {
      logger.error('[HTTP Channel] Failed to start server:', error);
      reject(error);
    }
  });
}
