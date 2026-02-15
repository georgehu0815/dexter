import { useState, useCallback, useRef } from 'react';
import { startChat, cancelChat, getStreamUrl } from '../services/api';
import { useSSE } from './useSSE';
import type { Message, AgentEvent, ChatRequest } from '../types';

export function useAgentStream() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const currentMessageIdRef = useRef<string | null>(null);

  /**
   * Handle incoming SSE events
   */
  const handleEvent = useCallback((event: AgentEvent) => {
    const messageId = currentMessageIdRef.current;
    if (!messageId) return;

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;

        // Add event to message
        const updatedMsg = {
          ...msg,
          events: [...msg.events, event],
        };

        // If done, extract answer and mark as complete
        if (event.type === 'done') {
          updatedMsg.answer = event.answer;
          updatedMsg.isProcessing = false;
        }

        // If error, mark as complete with error
        if (event.type === 'tool_error') {
          updatedMsg.error = event.error;
          updatedMsg.isProcessing = false;
        }

        return updatedMsg;
      })
    );

    // Stop processing when done
    if (event.type === 'done' || event.type === 'tool_error') {
      setIsProcessing(false);
      setCurrentSessionId(null);
      currentMessageIdRef.current = null;
    }
  }, []);

  /**
   * SSE connection (only active when processing)
   */
  const streamUrl = currentSessionId
    ? getStreamUrl(currentSessionId)
    : '';
  const sseEnabled = isProcessing && !!currentSessionId;

  console.log('[useAgentStream] SSE configuration: - useAgentStream.ts:63', {
    enabled: sseEnabled,
    sessionId: currentSessionId,
    url: streamUrl,
    isProcessing,
  });

  useSSE({
    url: streamUrl,
    onEvent: handleEvent,
    onError: (error) => {
      console.error('[useAgentStream] SSE error: - useAgentStream.ts:74', error);
      setError('Connection error. Please try again.');
      setIsProcessing(false);
      setCurrentSessionId(null);
      currentMessageIdRef.current = null;
    },
    enabled: sseEnabled,
  });

  /**
   * Send a new message to the agent
   */
  const sendMessage = useCallback(async (query: string, userId?: string) => {
    console.log('[useAgentStream] ═══════════════════════════════════════ - useAgentStream.ts:87');
    console.log('[useAgentStream] 📤 sendMessage called - useAgentStream.ts:88');
    console.log('[useAgentStream]    Query: - useAgentStream.ts:89', query);
    console.log('[useAgentStream]    UserId: - useAgentStream.ts:90', userId || 'anonymous');
    console.log('[useAgentStream]    isProcessing: - useAgentStream.ts:91', isProcessing);
    console.log('[useAgentStream] ═══════════════════════════════════════ - useAgentStream.ts:92');

    if (isProcessing) {
      console.error('[useAgentStream] ❌ Already processing a message - useAgentStream.ts:95');
      throw new Error('Already processing a message');
    }

    if (!query.trim()) {
      console.error('[useAgentStream] ❌ Query is empty - useAgentStream.ts:100');
      throw new Error('Query cannot be empty');
    }

    setError(null);
    setIsProcessing(true);

    // Create new message
    const messageId = `msg-${Date.now()}`;
    const newMessage: Message = {
      id: messageId,
      query: query.trim(),
      userId: userId || 'anonymous',
      timestamp: Date.now(),
      events: [],
      isProcessing: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    currentMessageIdRef.current = messageId;

    console.log('[useAgentStream] ✅ Message created: - useAgentStream.ts:121', messageId);

    try {
      // Start chat session
      const request: ChatRequest = {
        query: query.trim(),
        userId,
      };

      console.log('[useAgentStream] 🚀 Calling startChat API... - useAgentStream.ts:130');
      console.log('[useAgentStream]    Request: - useAgentStream.ts:131', JSON.stringify(request));

      const response = await startChat(request);

      console.log('[useAgentStream] ✅ startChat response received - useAgentStream.ts:135');
      console.log('[useAgentStream]    Session ID: - useAgentStream.ts:136', response.sessionId);
      console.log('[useAgentStream]    Stream URL: - useAgentStream.ts:137', response.streamUrl);

      setCurrentSessionId(response.sessionId);

      console.log('[useAgentStream] 📡 SSE will now connect to: - useAgentStream.ts:141', response.streamUrl);

      // SSE will now connect automatically via useSSE hook
    } catch (err) {
      console.error('[useAgentStream] ❌❌❌ Failed to start chat: - useAgentStream.ts:145', err);
      console.error('[useAgentStream]    Error type: - useAgentStream.ts:146', err instanceof Error ? 'Error' : typeof err);
      console.error('[useAgentStream]    Error message: - useAgentStream.ts:147', err instanceof Error ? err.message : String(err));
      console.error('[useAgentStream]    Full error: - useAgentStream.ts:148', err);

      const errorMessage = err instanceof Error ? err.message : String(err);

      setError(errorMessage);
      setIsProcessing(false);
      setCurrentSessionId(null);
      currentMessageIdRef.current = null;

      // Update message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, error: errorMessage, isProcessing: false }
            : msg
        )
      );
    }
  }, [isProcessing]);

  /**
   * Cancel the current running message
   */
  const cancelMessage = useCallback(async () => {
    const sessionId = currentSessionId;
    if (!sessionId) return;

    try {
      await cancelChat(sessionId);
      console.log('[useAgentStream] Cancelled session: - useAgentStream.ts:177', sessionId);
    } catch (err) {
      console.error('[useAgentStream] Failed to cancel: - useAgentStream.ts:179', err);
    }

    setIsProcessing(false);
    setCurrentSessionId(null);

    // Mark current message as cancelled
    if (currentMessageIdRef.current) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === currentMessageIdRef.current
            ? { ...msg, error: 'Cancelled by user', isProcessing: false }
            : msg
        )
      );
      currentMessageIdRef.current = null;
    }
  }, [currentSessionId]);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isProcessing,
    error,
    sendMessage,
    cancelMessage,
    clearMessages,
  };
}
