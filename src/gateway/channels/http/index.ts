/**
 * HTTP Channel Plugin
 *
 * Provides REST API and Server-Sent Events (SSE) for web-based chat interface
 */

export { createHttpPlugin, sendEventToClient, type HttpChannelConfig } from './plugin.js';
export { createHttpServer, startHttpServer } from './server.js';
export { connectionManager, ConnectionManager } from './connection-manager.js';
export type {
  HttpAccountConfig,
  HttpInboundMessage,
  SSEConnection,
  ChatRequest,
  ChatResponse,
  SSEEvent,
  CancelRequest,
  HealthResponse,
} from './types.js';
