import type { Response } from 'express';
import type { SSEConnection, SSEEvent } from './types.js';
import type { AgentEvent } from '@/agent/types.js';
import { logger } from '@/utils/logger.js';

/**
 * Manages SSE connections for real-time agent event streaming
 */
export class ConnectionManager {
  private connections: Map<string, SSEConnection>;
  private abortControllers: Map<string, AbortController>;

  constructor() {
    this.connections = new Map();
    this.abortControllers = new Map();
  }

  /**
   * Add a new SSE connection
   */
  addConnection(sessionId: string, userId: string, response: Response): void {
    // Set SSE headers
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Store connection
    const connection: SSEConnection = {
      sessionId,
      userId,
      response,
      createdAt: Date.now(),
      lastEventAt: Date.now(),
    };

    this.connections.set(sessionId, connection);
    this.abortControllers.set(sessionId, new AbortController());

    logger.info(`[ConnectionManager] ┌────────────────────────────────────┐`);
    logger.info(`[ConnectionManager] │ ✅ SSE CONNECTION ESTABLISHED     │`);
    logger.info(`[ConnectionManager] ├────────────────────────────────────┤`);
    logger.info(`[ConnectionManager] │ Session: ${sessionId.substring(0, 20).padEnd(20)} │`);
    logger.info(`[ConnectionManager] │ User:    ${userId.substring(0, 20).padEnd(20)} │`);
    logger.info(`[ConnectionManager] │ Active:  ${this.connections.size} connection(s)${' '.padEnd(8)}│`);
    logger.info(`[ConnectionManager] └────────────────────────────────────┘`);

    // Clean up on client disconnect
    response.on('close', () => {
      this.removeConnection(sessionId);
    });

    // Send initial connection confirmation
    logger.debug(`[ConnectionManager] 📤 Sending initial 'connected' event`);
    this.sendEvent(sessionId, {
      event: 'connected',
      data: {
        type: 'thinking',
        message: 'Connected to agent',
      } as AgentEvent,
    });
  }

  /**
   * Remove a connection
   */
  removeConnection(sessionId: string): void {
    const connection = this.connections.get(sessionId);
    if (connection) {
      const duration = Date.now() - connection.createdAt;
      const durationSec = (duration / 1000).toFixed(1);

      connection.response.end();
      this.connections.delete(sessionId);

      logger.info(`[ConnectionManager] 🔌 SSE connection closed: ${sessionId}`);
      logger.info(`[ConnectionManager]    Duration: ${durationSec}s`);
      logger.info(`[ConnectionManager]    Remaining: ${this.connections.size} connection(s)`);
    }

    const controller = this.abortControllers.get(sessionId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(sessionId);
    }
  }

  /**
   * Send an event to a specific session
   */
  sendEvent(sessionId: string, event: SSEEvent): boolean {
    const connection = this.connections.get(sessionId);
    if (!connection) {
      logger.warn(`[ConnectionManager] ⚠️  No connection found for session: ${sessionId}`);
      return false;
    }

    try {
      const eventType = event.event || event.data.type;
      const data = JSON.stringify(event.data);

      logger.debug(`[ConnectionManager] 📡 Sending SSE event to session: ${sessionId}`);
      logger.debug(`[ConnectionManager]    Event Type: ${eventType}`);
      logger.debug(`[ConnectionManager]    Data: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`);

      connection.response.write(`event: ${eventType}\n`);
      connection.response.write(`data: ${data}\n\n`);

      connection.lastEventAt = Date.now();
      logger.debug(`[ConnectionManager]    ✅ Event transmitted successfully`);
      return true;
    } catch (error) {
      logger.error(`[ConnectionManager] ❌ Error sending event: ${error}`);
      this.removeConnection(sessionId);
      return false;
    }
  }

  /**
   * Get abort signal for a session
   */
  getAbortSignal(sessionId: string): AbortSignal | undefined {
    return this.abortControllers.get(sessionId)?.signal;
  }

  /**
   * Check if session has an active connection
   */
  hasConnection(sessionId: string): boolean {
    return this.connections.has(sessionId);
  }

  /**
   * Get number of active connections
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get all session IDs
   */
  getSessionIds(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Clean up stale connections (older than timeout)
   */
  cleanStaleConnections(timeoutMs: number = 300000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, connection] of this.connections.entries()) {
      if (now - connection.lastEventAt > timeoutMs) {
        logger.info(`[ConnectionManager] Cleaning stale connection: ${sessionId}`);
        this.removeConnection(sessionId);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Singleton instance
export const connectionManager = new ConnectionManager();
