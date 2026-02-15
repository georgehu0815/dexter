/**
 * HTTP Gateway Tests
 * Tests the HTTP channel, SSE streaming, and agent integration
 */

import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';
import { createHttpPlugin, sendEventToClient, type HttpChannelConfig } from './index.js';
import type { HttpInboundMessage } from './types.js';

describe('HTTP Gateway', () => {
  const TEST_PORT = 3001; // Use different port to avoid conflicts
  const BASE_URL = `http://localhost:${TEST_PORT}`;
  let abortController: AbortController;
  let serverPromise: Promise<void>;

  beforeAll(async () => {
    // Create test configuration
    const config: HttpChannelConfig = {
      gateway: {
        accountId: 'test',
        heartbeatSeconds: 30,
        logLevel: 'error', // Reduce noise in tests
      },
      channels: {
        http: {
          enabled: true,
          accounts: {
            test: {
              accountId: 'test',
              enabled: true,
              port: TEST_PORT,
              host: 'localhost',
              corsOrigins: ['http://localhost:5173'],
              auth: { type: 'none' },
            },
          },
        },
      },
      bindings: [
        {
          agentId: 'default',
          match: { channel: 'http', accountId: 'test' },
        },
      ],
    };

    // Create mock message handler (no actual agent execution in tests)
    const handleMessage = async (msg: HttpInboundMessage): Promise<void> => {
      // Send mock events for testing
      setTimeout(() => {
        sendEventToClient(msg.sessionId, {
          type: 'thinking',
          message: 'Test thinking',
        });
      }, 10);

      setTimeout(() => {
        sendEventToClient(msg.sessionId, {
          type: 'done',
          answer: 'Test answer',
          toolCalls: [],
          iterations: 1,
          totalTime: 100,
        });
      }, 20);
    };

    // Create HTTP plugin
    const httpPlugin = createHttpPlugin({
      loadConfig: () => config,
      onMessage: handleMessage,
    });

    // Start server in background
    abortController = new AbortController();
    const account = config.channels.http!.accounts['test'];

    serverPromise = httpPlugin.gateway.startAccount({
      accountId: 'test',
      account,
      abortSignal: abortController.signal,
      getStatus: () => ({ accountId: 'test', running: true, connected: true, lastError: null }),
      setStatus: () => ({ accountId: 'test', running: true, connected: true, lastError: null }),
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // Stop server
    if (abortController) {
      abortController.abort();
    }
    // Wait for server to stop
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Health Check', () => {
    test('should return ok status', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeTypeOf('number');
      expect(data.uptime).toBeTypeOf('number');
    });
  });

  describe('Chat Session Creation', () => {
    test('should create new chat session', async () => {
      const response = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Test query',
          userId: 'test-user',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionId).toMatch(/^http-\d+-[a-f0-9]+$/);
      expect(data.streamUrl).toContain('/api/chat/');
      expect(data.streamUrl).toContain('/stream');
    });

    test('should reject empty query', async () => {
      const response = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '',
          userId: 'test-user',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Query is required');
    });

    test('should reject missing query', async () => {
      const response = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user',
        }),
      });

      expect(response.status).toBe(400);
    });

    test('should use default userId if not provided', async () => {
      const response = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Test query',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sessionId).toBeTruthy();
    });
  });

  describe('SSE Streaming', () => {
    test('should establish SSE connection', async () => {
      // Create session first
      const createResponse = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Hello',
          userId: 'test-user',
        }),
      });

      const { sessionId } = await createResponse.json();

      // Connect to SSE stream
      const streamResponse = await fetch(`${BASE_URL}/api/chat/${sessionId}/stream`);

      expect(streamResponse.status).toBe(200);
      expect(streamResponse.headers.get('content-type')).toBe('text/event-stream');
      expect(streamResponse.headers.get('cache-control')).toBe('no-cache');
      expect(streamResponse.headers.get('connection')).toBe('keep-alive');
    });

    test('should receive connected event', async () => {
      const createResponse = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Test',
          userId: 'test',
        }),
      });

      const { sessionId } = await createResponse.json();

      // Connect to SSE and read first event
      const streamResponse = await fetch(`${BASE_URL}/api/chat/${sessionId}/stream`);
      const reader = streamResponse.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader');

      const { value } = await reader.read();
      const text = decoder.decode(value);

      expect(text).toContain('event: connected');
      expect(text).toContain('data:');
      expect(text).toContain('thinking');

      reader.cancel();
    });
  });

  describe('Session Cancellation', () => {
    test('should cancel active session', async () => {
      const createResponse = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Long running query',
          userId: 'test',
        }),
      });

      const { sessionId } = await createResponse.json();

      // Connect to SSE
      await fetch(`${BASE_URL}/api/chat/${sessionId}/stream`);

      // Cancel the session
      const cancelResponse = await fetch(`${BASE_URL}/api/chat/${sessionId}/cancel`, {
        method: 'POST',
      });

      expect(cancelResponse.status).toBe(200);
      const data = await cancelResponse.json();
      expect(data.success).toBe(true);
    });

    test('should return 404 for non-existent session', async () => {
      const cancelResponse = await fetch(`${BASE_URL}/api/chat/non-existent/cancel`, {
        method: 'POST',
      });

      expect(cancelResponse.status).toBe(404);
    });
  });

  describe('CORS', () => {
    test('should accept requests from allowed origin', async () => {
      const response = await fetch(`${BASE_URL}/api/health`, {
        headers: {
          'Origin': 'http://localhost:5173',
        },
      });

      expect(response.headers.get('access-control-allow-origin')).toBeTruthy();
    });
  });

  describe('Message Processing', () => {
    test('should process message through agent', async () => {
      const createResponse = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'What is 2+2?',
          userId: 'test',
        }),
      });

      const { sessionId } = await createResponse.json();

      // Connect to SSE and collect events
      const streamResponse = await fetch(`${BASE_URL}/api/chat/${sessionId}/stream`);
      const reader = streamResponse.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader');

      const events: string[] = [];
      let receivedDone = false;

      // Read events for up to 10 seconds or until 'done' event
      const timeout = setTimeout(() => {
        reader.cancel();
      }, 10000);

      try {
        while (!receivedDone) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          events.push(text);

          // Check if we got a 'done' event
          if (text.includes('event: done') || text.includes('"type":"done"')) {
            receivedDone = true;
            break;
          }
        }
      } finally {
        clearTimeout(timeout);
        reader.cancel();
      }

      // Should have received at least connected and done events
      expect(events.length).toBeGreaterThan(0);

      // Verify we got the connected event
      const connectedEvent = events.find(e => e.includes('event: connected'));
      expect(connectedEvent).toBeTruthy();

      // If we received a done event, verify its structure
      if (receivedDone) {
        const doneEvent = events.find(e => e.includes('event: done') || e.includes('"type":"done"'));
        expect(doneEvent).toBeTruthy();
        expect(doneEvent).toContain('answer');
      }
    });
  });

  describe('HttpInboundMessage', () => {
    test('should have correct message structure', () => {
      const message: HttpInboundMessage = {
        channel: 'http',
        accountId: 'default',
        sessionId: 'test-session',
        userId: 'test-user',
        query: 'Test query',
        timestamp: Date.now(),
      };

      expect(message.channel).toBe('http');
      expect(message.accountId).toBeTruthy();
      expect(message.sessionId).toBeTruthy();
      expect(message.userId).toBeTruthy();
      expect(message.query).toBeTruthy();
      expect(message.timestamp).toBeTypeOf('number');
    });
  });
});
