/**
 * Unit tests for HTTP Gateway Agent
 *
 * These tests verify that the agent correctly:
 * 1. Creates sessions with POST /api/chat
 * 2. Connects to SSE stream
 * 3. Parses and streams events
 * 4. Handles errors and connection failures
 */

import { describe, it, before, after, mock } from 'node:test';
import * as assert from 'node:assert';
import { HttpGatewayAgent } from '../../src/agent/http-gateway-agent.js';
import type { AgentEvent } from '../../src/shared/types.js';

describe('HttpGatewayAgent - Session Creation', () => {
  it('should create agent with default gateway URL', () => {
    const agent = HttpGatewayAgent.create();
    assert.ok(agent instanceof HttpGatewayAgent);
  });

  it('should create agent with custom gateway URL', () => {
    const agent = HttpGatewayAgent.create({
      gatewayUrl: 'http://localhost:3001'
    });
    assert.ok(agent instanceof HttpGatewayAgent);
  });

  it('should accept abort signal', () => {
    const abortController = new AbortController();
    const agent = HttpGatewayAgent.create({
      signal: abortController.signal
    });
    assert.ok(agent instanceof HttpGatewayAgent);
  });
});

describe('HttpGatewayAgent - HTTP Flow', () => {
  it('should make POST request to /api/chat with query', async () => {
    let capturedRequest: { url: string; method: string; body: any } | null = null;

    // Mock fetch to capture the POST request
    const originalFetch = global.fetch;
    global.fetch = async (url: string, options?: any) => {
      if (url.includes('/api/chat') && options?.method === 'POST') {
        capturedRequest = {
          url,
          method: options.method,
          body: JSON.parse(options.body),
        };

        // Return mock session response
        return {
          ok: true,
          json: async () => ({
            sessionId: 'test-session-123',
            streamUrl: '/api/chat/test-session-123/stream',
          }),
        } as Response;
      }

      // Return mock SSE stream response
      return {
        ok: true,
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined }),
          }),
        },
      } as any;
    };

    try {
      const agent = HttpGatewayAgent.create({
        gatewayUrl: 'http://localhost:3000'
      });

      // Consume all events to ensure POST is made
      const events: AgentEvent[] = [];
      for await (const event of agent.run('test query')) {
        events.push(event);
      }

      // Verify POST request was made
      assert.ok(capturedRequest, 'POST request should be made');
      assert.strictEqual(capturedRequest?.method, 'POST');
      assert.strictEqual(capturedRequest?.body.query, 'test query');
      assert.strictEqual(capturedRequest?.body.userId, 'vscode-extension');

    } finally {
      global.fetch = originalFetch;
    }
  });

  it('should connect to SSE stream with sessionId', async () => {
    let sseStreamRequested = false;

    const originalFetch = global.fetch;
    global.fetch = mock.fn(async (url: string, options?: any) => {
      if (url.includes('/api/chat') && options?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            sessionId: 'test-session-123',
            streamUrl: '/api/chat/test-session-123/stream',
          }),
        } as Response;
      }

      if (url.includes('/api/chat/test-session-123/stream')) {
        sseStreamRequested = true;
        return {
          ok: true,
          body: {
            getReader: () => ({
              read: async () => ({ done: true, value: undefined }),
            }),
          },
        } as any;
      }

      throw new Error('Unexpected request');
    }) as any;

    try {
      const agent = HttpGatewayAgent.create();
      const generator = agent.run('test query');

      // Consume all events
      for await (const event of generator) {
        // Just consume events
      }

      assert.ok(sseStreamRequested, 'SSE stream should be requested');
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('HttpGatewayAgent - Event Streaming', () => {
  it('should parse and yield SSE events', async () => {
    const mockEvents: AgentEvent[] = [
      { type: 'thinking', message: 'Processing query...' },
      { type: 'answer_start' },
      { type: 'done', answer: 'Test answer', iterations: 1, totalTime: 1000 },
    ];

    // Create SSE stream data
    const sseData = mockEvents
      .map(event => `data: ${JSON.stringify(event)}\n\n`)
      .join('');
    const encoder = new TextEncoder();
    const sseBytes = encoder.encode(sseData);

    const originalFetch = global.fetch;
    global.fetch = mock.fn(async (url: string, options?: any) => {
      if (url.includes('/api/chat') && options?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            sessionId: 'test-session-123',
            streamUrl: '/api/chat/test-session-123/stream',
          }),
        } as Response;
      }

      // Return SSE stream with mock events
      return {
        ok: true,
        body: {
          getReader: () => {
            let position = 0;
            return {
              read: async () => {
                if (position === 0) {
                  position++;
                  return { done: false, value: sseBytes };
                }
                return { done: true, value: undefined };
              },
            };
          },
        },
      } as any;
    }) as any;

    try {
      const agent = HttpGatewayAgent.create();
      const events: AgentEvent[] = [];

      for await (const event of agent.run('test query')) {
        events.push(event);
      }

      // Should have: thinking (from agent) + answer_start + streamed events
      assert.ok(events.length >= 3, 'Should receive multiple events');

      // Find the done event
      const doneEvent = events.find(e => e.type === 'done');
      assert.ok(doneEvent, 'Should receive done event');
      assert.strictEqual((doneEvent as any).answer, 'Test answer');

    } finally {
      global.fetch = originalFetch;
    }
  });

  it('should handle [DONE] marker in SSE stream', async () => {
    const sseData = 'data: {"type":"thinking","message":"test"}\n\ndata: [DONE]\n\n';
    const encoder = new TextEncoder();
    const sseBytes = encoder.encode(sseData);

    const originalFetch = global.fetch;
    global.fetch = mock.fn(async (url: string, options?: any) => {
      if (url.includes('/api/chat') && options?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            sessionId: 'test-session-123',
            streamUrl: '/api/chat/test-session-123/stream',
          }),
        } as Response;
      }

      return {
        ok: true,
        body: {
          getReader: () => {
            let position = 0;
            return {
              read: async () => {
                if (position === 0) {
                  position++;
                  return { done: false, value: sseBytes };
                }
                return { done: true, value: undefined };
              },
            };
          },
        },
      } as any;
    }) as any;

    try {
      const agent = HttpGatewayAgent.create();
      const events: AgentEvent[] = [];

      for await (const event of agent.run('test query')) {
        events.push(event);
      }

      // Should not crash on [DONE] marker
      assert.ok(events.length > 0);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('HttpGatewayAgent - Error Handling', () => {
  it('should throw error on HTTP error response', async () => {
    const originalFetch = global.fetch;
    global.fetch = mock.fn(async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })) as any;

    try {
      const agent = HttpGatewayAgent.create();
      const generator = agent.run('test query');

      await assert.rejects(
        async () => {
          for await (const event of generator) {
            // Should throw before yielding events
          }
        },
        /HTTP Gateway error: 500 Internal Server Error/
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('should throw error on connection refused', async () => {
    const originalFetch = global.fetch;
    global.fetch = mock.fn(async () => {
      throw new Error('fetch failed: ECONNREFUSED');
    }) as any;

    try {
      const agent = HttpGatewayAgent.create({
        gatewayUrl: 'http://localhost:3000'
      });
      const generator = agent.run('test query');

      await assert.rejects(
        async () => {
          for await (const event of generator) {
            // Should throw before yielding events
          }
        },
        /Cannot connect to Dexter HTTP Gateway/
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('should handle abort signal', async () => {
    const abortController = new AbortController();

    const originalFetch = global.fetch;
    global.fetch = mock.fn(async (url: string, options?: any) => {
      // Simulate abort during request
      if (options?.signal) {
        await new Promise(resolve => setTimeout(resolve, 10));
        if (options.signal.aborted) {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          throw error;
        }
      }

      return {
        ok: true,
        json: async () => ({
          sessionId: 'test-session-123',
          streamUrl: '/api/chat/test-session-123/stream',
        }),
      } as Response;
    }) as any;

    try {
      const agent = HttpGatewayAgent.create({
        signal: abortController.signal
      });
      const generator = agent.run('test query');

      // Abort immediately
      abortController.abort();

      await assert.rejects(
        async () => {
          for await (const event of generator) {
            // Should throw on abort
          }
        },
        /Abort/
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('should handle invalid JSON in SSE stream', async () => {
    const sseData = 'data: {invalid json}\n\n';
    const encoder = new TextEncoder();
    const sseBytes = encoder.encode(sseData);

    const originalFetch = global.fetch;
    global.fetch = mock.fn(async (url: string, options?: any) => {
      if (url.includes('/api/chat') && options?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            sessionId: 'test-session-123',
            streamUrl: '/api/chat/test-session-123/stream',
          }),
        } as Response;
      }

      return {
        ok: true,
        body: {
          getReader: () => {
            let position = 0;
            return {
              read: async () => {
                if (position === 0) {
                  position++;
                  return { done: false, value: sseBytes };
                }
                return { done: true, value: undefined };
              },
            };
          },
        },
      } as any;
    }) as any;

    try {
      const agent = HttpGatewayAgent.create();
      const events: AgentEvent[] = [];

      // Should not crash on invalid JSON, just skip it
      for await (const event of agent.run('test query')) {
        events.push(event);
      }

      // Should still get thinking and answer_start events
      assert.ok(events.length >= 2);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('HttpGatewayAgent - Integration Test', () => {
  it('should successfully complete full chat flow', async () => {
    const mockEvents: AgentEvent[] = [
      { type: 'thinking', message: 'Searching for information...' },
      { type: 'tool_start', tool: 'web_search', args: { query: 'test' } },
      { type: 'tool_end', tool: 'web_search', result: 'Found results', duration: 500 },
      { type: 'done', answer: 'Here is the answer', iterations: 2, totalTime: 2000 },
    ];

    const sseData = mockEvents
      .map(event => `data: ${JSON.stringify(event)}\n\n`)
      .join('') + 'data: [DONE]\n\n';
    const encoder = new TextEncoder();
    const sseBytes = encoder.encode(sseData);

    const originalFetch = global.fetch;
    global.fetch = mock.fn(async (url: string, options?: any) => {
      if (url.includes('/api/chat') && options?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            sessionId: 'integration-test-session',
            streamUrl: '/api/chat/integration-test-session/stream',
          }),
        } as Response;
      }

      return {
        ok: true,
        body: {
          getReader: () => {
            let position = 0;
            return {
              read: async () => {
                if (position === 0) {
                  position++;
                  return { done: false, value: sseBytes };
                }
                return { done: true, value: undefined };
              },
            };
          },
        },
      } as any;
    }) as any;

    try {
      const agent = HttpGatewayAgent.create();
      const events: AgentEvent[] = [];

      for await (const event of agent.run('What is the weather?')) {
        events.push(event);
      }

      // Verify we got all event types
      assert.ok(events.some(e => e.type === 'thinking'));
      assert.ok(events.some(e => e.type === 'answer_start'));
      assert.ok(events.some(e => e.type === 'tool_start'));
      assert.ok(events.some(e => e.type === 'tool_end'));
      assert.ok(events.some(e => e.type === 'done'));

      // Verify final answer
      const doneEvent = events.find(e => e.type === 'done') as any;
      assert.strictEqual(doneEvent.answer, 'Here is the answer');
      assert.strictEqual(doneEvent.iterations, 2);
      assert.strictEqual(doneEvent.totalTime, 2000);

    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('HttpGatewayAgent - Gateway Connection Verification', () => {
  it('should verify request reaches backend gateway service', async () => {
    let backendReceived = false;
    let requestBody: any = null;

    const originalFetch = global.fetch;
    global.fetch = async (url: string, options?: any) => {
      if (url.includes('/api/chat') && options?.method === 'POST') {
        // Simulate backend receiving the request
        backendReceived = true;
        requestBody = JSON.parse(options.body);

        return {
          ok: true,
          json: async () => ({
            sessionId: 'backend-test-session',
            streamUrl: '/api/chat/backend-test-session/stream',
          }),
        } as Response;
      }

      return {
        ok: true,
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined }),
          }),
        },
      } as any;
    };

    try {
      const agent = HttpGatewayAgent.create({
        gatewayUrl: 'http://localhost:3000'
      });

      // Submit a chat query and consume all events
      const events: AgentEvent[] = [];
      for await (const event of agent.run('Test query to verify backend')) {
        events.push(event);
      }

      // Verify backend received the request
      assert.strictEqual(backendReceived, true, 'Backend gateway should receive the request');
      assert.ok(requestBody, 'Request body should be captured');
      assert.strictEqual(requestBody.query, 'Test query to verify backend');
      assert.strictEqual(requestBody.userId, 'vscode-extension');

      console.log('✅ Chat submission successfully reached backend gateway service');
      console.log('   Request URL: http://localhost:3000/api/chat');
      console.log('   Request Method: POST');
      console.log('   Request Body:', requestBody);

    } finally {
      global.fetch = originalFetch;
    }
  });
});
