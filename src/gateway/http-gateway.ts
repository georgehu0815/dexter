#!/usr/bin/env tsx
/**
 * HTTP Gateway - Web API for Dexter Agent
 *
 * Starts an HTTP server with REST API and SSE for web-based chat interface
 */

import { config } from 'dotenv';
import { createHttpPlugin, sendEventToClient, type HttpChannelConfig } from './channels/http/index.js';
import { runAgentForMessage } from './agent-runner.js';
import type { HttpInboundMessage } from './channels/http/types.js';
import { logger } from '../utils/logger.js';
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from '../model/llm.js';

// Load environment variables
config({ quiet: true });

/**
 * Default HTTP channel configuration
 */
function getDefaultConfig(): HttpChannelConfig {
  const port = parseInt(process.env.HTTP_CHANNEL_PORT || '3000', 10);
  const host = process.env.HTTP_CHANNEL_HOST || 'localhost';
  const corsOrigins = (process.env.HTTP_CHANNEL_CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map(origin => origin.trim());

  return {
    gateway: {
      accountId: 'default',
      heartbeatSeconds: 30,
      logLevel: 'info',
    },
    channels: {
      http: {
        enabled: true,
        accounts: {
          default: {
            accountId: 'default',
            enabled: true,
            port,
            host,
            corsOrigins,
            auth: {
              type: 'none', // No auth for MVP/localhost
            },
          },
        },
      },
    },
    bindings: [
      {
        agentId: 'default',
        match: {
          channel: 'http',
          accountId: 'default',
        },
      },
    ],
  };
}

/**
 * Handle inbound HTTP messages and run agent
 */
async function handleInboundMessage(msg: HttpInboundMessage): Promise<void> {
  logger.info(`[HTTP Gateway] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  logger.info(`[HTTP Gateway] 📥 NEW MESSAGE RECEIVED`);
  logger.info(`[HTTP Gateway]    Session ID: ${msg.sessionId}`);
  logger.info(`[HTTP Gateway]    User ID:    ${msg.userId}`);
  logger.info(`[HTTP Gateway]    Query:      "${msg.query}"`);
  logger.info(`[HTTP Gateway]    Timestamp:  ${new Date(msg.timestamp).toISOString()}`);
  logger.info(`[HTTP Gateway] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  try {
    // Build session key for conversation history
    // Format: agent:agentId:channel:accountId:peerKind:peerId
    const sessionKey = `agent:default:http:${msg.accountId}:direct:${msg.userId}`;
    logger.info(`[HTTP Gateway] 🔑 Session key: ${sessionKey}`);
    logger.info(`[HTTP Gateway] 🤖 Starting agent with model: ${DEFAULT_MODEL} (${DEFAULT_PROVIDER})`);

    let eventCount = 0;

    // Run agent with event streaming
    await runAgentForMessage({
      sessionKey,
      query: msg.query,
      model: DEFAULT_MODEL,
      modelProvider: DEFAULT_PROVIDER,
      onEvent: (event) => {
        eventCount++;

        // Log each event with details
        logger.info(`[HTTP Gateway] 📤 Event #${eventCount}: ${event.type}`);

        switch (event.type) {
          case 'thinking':
            logger.info(`[HTTP Gateway]    💭 Thinking: "${event.message}"`);
            break;
          case 'tool_start':
            logger.info(`[HTTP Gateway]    🔧 Tool Start: ${event.tool}`);
            logger.info(`[HTTP Gateway]       Args: ${JSON.stringify(event.args).substring(0, 100)}...`);
            break;
          case 'tool_end':
            logger.info(`[HTTP Gateway]    ✅ Tool End: ${event.tool}`);
            logger.info(`[HTTP Gateway]       Duration: ${event.duration}ms`);
            break;
          case 'tool_error':
            logger.error(`[HTTP Gateway]    ❌ Tool Error: ${event.tool}`);
            logger.error(`[HTTP Gateway]       Error: ${event.error}`);
            break;
          case 'done':
            logger.info(`[HTTP Gateway]    ✨ DONE!`);
            logger.info(`[HTTP Gateway]       Answer: "${event.answer.substring(0, 100)}..."`);
            logger.info(`[HTTP Gateway]       Iterations: ${event.iterations}`);
            logger.info(`[HTTP Gateway]       Total Time: ${event.totalTime}ms`);
            logger.info(`[HTTP Gateway]       Tokens: ${event.tokenUsage?.totalTokens || 0}`);
            break;
        }

        // Stream events to SSE client
        sendEventToClient(msg.sessionId, event);
        logger.info(`[HTTP Gateway]    📡 Streamed to client`);
      },
    });

    logger.info(`[HTTP Gateway] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    logger.info(`[HTTP Gateway] ✅ MESSAGE PROCESSING COMPLETE`);
    logger.info(`[HTTP Gateway]    Total Events: ${eventCount}`);
    logger.info(`[HTTP Gateway] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  } catch (error) {
    logger.error(`[HTTP Gateway] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    logger.error(`[HTTP Gateway] ❌ ERROR PROCESSING MESSAGE`);
    logger.error(`[HTTP Gateway]    Session: ${msg.sessionId}`);
    logger.error(`[HTTP Gateway]    Error: ${error instanceof Error ? error.message : String(error)}`);
    logger.error(`[HTTP Gateway] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Send error event to client
    sendEventToClient(msg.sessionId, {
      type: 'tool_error',
      tool: 'agent',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Start HTTP gateway
 */
async function startHttpGateway(): Promise<void> {
  logger.info('[HTTP Gateway] Starting...');

  const config = getDefaultConfig();

  // Create HTTP plugin
  const httpPlugin = createHttpPlugin({
    loadConfig: () => config,
    onMessage: handleInboundMessage,
  });

  // Get default account
  const accountId = 'default';
  const account = httpPlugin.config.resolveAccount(config, accountId);

  // Check if enabled
  if (httpPlugin.config.isEnabled && !httpPlugin.config.isEnabled(account, config)) {
    logger.error('[HTTP Gateway] HTTP channel is not enabled');
    process.exit(1);
  }

  // Check if configured
  if (httpPlugin.config.isConfigured) {
    const isConfigured = await httpPlugin.config.isConfigured(account, config);
    if (!isConfigured) {
      logger.error('[HTTP Gateway] HTTP channel is not properly configured');
      process.exit(1);
    }
  }

  // Create abort controller for graceful shutdown
  const abortController = new AbortController();

  // Setup graceful shutdown
  process.on('SIGINT', () => {
    logger.info('[HTTP Gateway] Received SIGINT, shutting down...');
    abortController.abort();
  });

  process.on('SIGTERM', () => {
    logger.info('[HTTP Gateway] Received SIGTERM, shutting down...');
    abortController.abort();
  });

  // Track runtime status
  let runtimeStatus = {
    accountId,
    running: true,
    connected: false,
    lastError: null as string | null,
  };

  // Start the account
  try {
    await httpPlugin.gateway.startAccount({
      accountId,
      account,
      abortSignal: abortController.signal,
      getStatus: () => runtimeStatus,
      setStatus: (status) => {
        runtimeStatus = { ...runtimeStatus, ...status };
        logger.info(`[HTTP Gateway] Status update:`, runtimeStatus);
        return runtimeStatus;
      },
    });

    logger.info('[HTTP Gateway] Stopped');
    process.exit(0);
  } catch (error) {
    logger.error('[HTTP Gateway] Fatal error:', error);
    process.exit(1);
  }
}

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startHttpGateway().catch((error) => {
    logger.error('[HTTP Gateway] Unhandled error:', error);
    process.exit(1);
  });
}

export { startHttpGateway, getDefaultConfig, handleInboundMessage };
