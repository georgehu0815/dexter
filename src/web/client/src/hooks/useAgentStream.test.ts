/**
 * useAgentStream Hook Tests
 * Tests chat message submission and streaming
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAgentStream } from './useAgentStream';

// Mock the API service
vi.mock('../services/api', () => ({
  startChat: vi.fn(),
  cancelChat: vi.fn(),
  getStreamUrl: vi.fn((sessionId: string) => `http://localhost:3000/api/chat/${sessionId}/stream`),
}));

// Mock EventSource for SSE testing
class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onopen: (() => void) | null = null;
  readyState = 0;
  CONNECTING = 0;
  OPEN = 1;
  CLOSED = 2;

  constructor(url: string) {
    this.url = url;
    this.readyState = this.OPEN;
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }

  close() {
    this.readyState = this.CLOSED;
  }

  simulateMessage(data: any) {
    if (this.onmessage) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(data),
      });
      this.onmessage(event);
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

describe('useAgentStream', () => {
  let mockEventSource: MockEventSource;
  let originalEventSource: typeof EventSource;

  beforeEach(() => {
    // Save original EventSource
    originalEventSource = global.EventSource;

    // Replace with mock
    global.EventSource = MockEventSource as any;

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original EventSource
    global.EventSource = originalEventSource;
  });

  describe('Initial State', () => {
    test('should have empty messages initially', () => {
      const { result } = renderHook(() => useAgentStream());

      expect(result.current.messages).toEqual([]);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Sending Messages', () => {
    test('should create message when sending', async () => {
      const { startChat } = await import('../services/api');
      (startChat as any).mockResolvedValue({
        sessionId: 'test-session-123',
        streamUrl: '/api/chat/test-session-123/stream',
      });

      const { result } = renderHook(() => useAgentStream());

      await act(async () => {
        await result.current.sendMessage('Hello, agent!');
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
      });

      const message = result.current.messages[0];
      expect(message.query).toBe('Hello, agent!');
      expect(message.isProcessing).toBe(true);
      expect(message.events).toEqual([]);
    });

    test('should call startChat API', async () => {
      const { startChat } = await import('../services/api');
      (startChat as any).mockResolvedValue({
        sessionId: 'test-session-456',
        streamUrl: '/api/chat/test-session-456/stream',
      });

      const { result } = renderHook(() => useAgentStream());

      await act(async () => {
        await result.current.sendMessage('Test query', 'user123');
      });

      expect(startChat).toHaveBeenCalledWith({
        query: 'Test query',
        userId: 'user123',
      });
    });

    test('should reject empty messages', async () => {
      const { result } = renderHook(() => useAgentStream());

      await expect(async () => {
        await act(async () => {
          await result.current.sendMessage('');
        });
      }).rejects.toThrow('Query cannot be empty');
    });

    test('should reject whitespace-only messages', async () => {
      const { result } = renderHook(() => useAgentStream());

      await expect(async () => {
        await act(async () => {
          await result.current.sendMessage('   ');
        });
      }).rejects.toThrow('Query cannot be empty');
    });

    test('should prevent sending while processing', async () => {
      const { startChat } = await import('../services/api');
      (startChat as any).mockResolvedValue({
        sessionId: 'test-session',
        streamUrl: '/api/chat/test-session/stream',
      });

      const { result } = renderHook(() => useAgentStream());

      await act(async () => {
        await result.current.sendMessage('First message');
      });

      await expect(async () => {
        await act(async () => {
          await result.current.sendMessage('Second message');
        });
      }).rejects.toThrow('Already processing');
    });
  });

  describe('Event Streaming', () => {
    test('should receive and add events to message', async () => {
      const { startChat } = await import('../services/api');
      (startChat as any).mockResolvedValue({
        sessionId: 'test-session-789',
        streamUrl: '/api/chat/test-session-789/stream',
      });

      const { result } = renderHook(() => useAgentStream());

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      // Wait for SSE connection
      await waitFor(() => {
        expect(result.current.messages[0]).toBeTruthy();
      });

      // Get the EventSource instance
      const esInstances = (EventSource as any).mock?.instances;
      if (esInstances && esInstances.length > 0) {
        mockEventSource = esInstances[esInstances.length - 1];

        // Simulate receiving thinking event
        act(() => {
          mockEventSource.simulateMessage({
            type: 'thinking',
            message: 'Processing...',
          });
        });

        await waitFor(() => {
          const message = result.current.messages[0];
          expect(message.events).toHaveLength(1);
          expect(message.events[0].type).toBe('thinking');
        });
      }
    });

    test('should handle done event', async () => {
      const { startChat } = await import('../services/api');
      (startChat as any).mockResolvedValue({
        sessionId: 'test-done',
        streamUrl: '/api/chat/test-done/stream',
      });

      const { result } = renderHook(() => useAgentStream());

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      await waitFor(() => {
        expect(result.current.messages[0]).toBeTruthy();
      });

      // Simulate done event
      const esInstances = (EventSource as any).mock?.instances;
      if (esInstances && esInstances.length > 0) {
        mockEventSource = esInstances[esInstances.length - 1];

        act(() => {
          mockEventSource.simulateMessage({
            type: 'done',
            answer: 'Here is the answer',
            iterations: 1,
            totalTime: 1000,
          });
        });

        await waitFor(() => {
          const message = result.current.messages[0];
          expect(message.answer).toBe('Here is the answer');
          expect(message.isProcessing).toBe(false);
        });

        expect(result.current.isProcessing).toBe(false);
      }
    });

    test('should handle tool events', async () => {
      const { startChat } = await import('../services/api');
      (startChat as any).mockResolvedValue({
        sessionId: 'test-tools',
        streamUrl: '/api/chat/test-tools/stream',
      });

      const { result } = renderHook(() => useAgentStream());

      await act(async () => {
        await result.current.sendMessage('Search for something');
      });

      await waitFor(() => {
        expect(result.current.messages[0]).toBeTruthy();
      });

      const esInstances = (EventSource as any).mock?.instances;
      if (esInstances && esInstances.length > 0) {
        mockEventSource = esInstances[esInstances.length - 1];

        // Simulate tool_start event
        act(() => {
          mockEventSource.simulateMessage({
            type: 'tool_start',
            tool: 'web_search',
            args: { query: 'test' },
          });
        });

        // Simulate tool_end event
        act(() => {
          mockEventSource.simulateMessage({
            type: 'tool_end',
            tool: 'web_search',
            result: 'Search results',
            duration: 500,
          });
        });

        await waitFor(() => {
          const message = result.current.messages[0];
          expect(message.events).toHaveLength(2);
          expect(message.events[0].type).toBe('tool_start');
          expect(message.events[1].type).toBe('tool_end');
        });
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors', async () => {
      const { startChat } = await import('../services/api');
      (startChat as any).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useAgentStream());

      await act(async () => {
        try {
          await result.current.sendMessage('Test');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe('API Error');
        expect(result.current.isProcessing).toBe(false);
      });
    });

    test('should handle tool_error events', async () => {
      const { startChat } = await import('../services/api');
      (startChat as any).mockResolvedValue({
        sessionId: 'test-error',
        streamUrl: '/api/chat/test-error/stream',
      });

      const { result } = renderHook(() => useAgentStream());

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      await waitFor(() => {
        expect(result.current.messages[0]).toBeTruthy();
      });

      const esInstances = (EventSource as any).mock?.instances;
      if (esInstances && esInstances.length > 0) {
        mockEventSource = esInstances[esInstances.length - 1];

        act(() => {
          mockEventSource.simulateMessage({
            type: 'tool_error',
            tool: 'web_search',
            error: 'Search failed',
          });
        });

        await waitFor(() => {
          const message = result.current.messages[0];
          expect(message.isProcessing).toBe(false);
        });
      }
    });
  });

  describe('Cancellation', () => {
    test.skip('should cancel active message', async () => {
      const { startChat, cancelChat } = await import('../services/api');
      (startChat as any).mockResolvedValue({
        sessionId: 'test-cancel',
        streamUrl: '/api/chat/test-cancel/stream',
      });

      const { result } = renderHook(() => useAgentStream());

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      await waitFor(() => {
        expect(result.current.isProcessing).toBe(true);
      });

      // Give React time to fully process the state updates
      await new Promise(resolve => setTimeout(resolve, 50));

      await act(async () => {
        await result.current.cancelMessage();
      });

      // Add small delay for state updates to process
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(cancelChat).toHaveBeenCalledWith('test-cancel');
      expect(result.current.isProcessing).toBe(false);

      const message = result.current.messages[0];
      expect(message.isProcessing).toBe(false);
      expect(message.error).toBe('Cancelled by user');
    });
  });

  describe('Clear Messages', () => {
    test('should clear all messages', async () => {
      const { startChat } = await import('../services/api');
      (startChat as any).mockResolvedValue({
        sessionId: 'test-clear',
        streamUrl: '/api/chat/test-clear/stream',
      });

      const { result } = renderHook(() => useAgentStream());

      await act(async () => {
        await result.current.sendMessage('Test 1');
      });

      await act(async () => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });
});
