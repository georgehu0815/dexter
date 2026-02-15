import type { AgentEvent } from '@/agent/types.js';
import type { Response } from 'express';

/**
 * HTTP channel account configuration
 */
export interface HttpAccountConfig {
  accountId: string;
  enabled: boolean;
  port: number;
  host: string;
  corsOrigins: string[];
  auth?: {
    type: 'apikey' | 'jwt' | 'none';
    secret?: string;
  };
}

/**
 * Inbound HTTP message (normalized format for gateway)
 */
export interface HttpInboundMessage {
  channel: 'http';
  accountId: string;
  sessionId: string;
  userId: string;
  query: string;
  timestamp: number;
}

/**
 * SSE connection tracker
 */
export interface SSEConnection {
  sessionId: string;
  userId: string;
  response: Response;
  createdAt: number;
  lastEventAt: number;
}

/**
 * Chat request body
 */
export interface ChatRequest {
  query: string;
  userId?: string;
  model?: string;
  modelProvider?: string;
}

/**
 * Chat response
 */
export interface ChatResponse {
  sessionId: string;
  streamUrl: string;
}

/**
 * SSE event wrapper
 */
export interface SSEEvent {
  event: string;
  data: AgentEvent;
}

/**
 * Cancel request
 */
export interface CancelRequest {
  sessionId: string;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: number;
  uptime: number;
}
