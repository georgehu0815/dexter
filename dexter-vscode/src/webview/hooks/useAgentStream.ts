/**
 * Hook for agent streaming (adapted for VS Code message passing)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useVSCodeMessaging } from './useVSCodeMessaging';
import type { Message, AgentEvent, ExtensionToWebviewMessage } from '../types';

export function useAgentStream() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const currentMessageIdRef = useRef<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);

  /**
   * Handle messages from extension
   */
  const handleExtensionMessage = useCallback((message: ExtensionToWebviewMessage) => {
    console.log('[useAgentStream] Extension message: - useAgentStream.ts:21', message.type);

    switch (message.type) {
      case 'sessionStarted':
        console.log('[useAgentStream] Session started:', message.sessionId);
        console.log('[useAgentStream] Current message ID:', currentMessageIdRef.current);
        currentSessionIdRef.current = message.sessionId; // Use ref for immediate access
        setCurrentSessionId(message.sessionId);
        setIsProcessing(true);
        setError(null);
        break;

      case 'agentEvent':
        // Only process events if they match the current session (use ref for immediate access)
        if (message.sessionId && message.sessionId !== currentSessionIdRef.current) {
          console.log('[useAgentStream] Ignoring event from different session. Current:', currentSessionIdRef.current, 'Event from:', message.sessionId);
          return;
        }
        handleAgentEvent(message.event);
        break;

      case 'sessionCancelled':
        console.log('[useAgentStream] Session cancelled:', message.sessionId);
        currentSessionIdRef.current = null;
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
        break;

      case 'error':
        console.error('[useAgentStream] Error: - useAgentStream.ts:54', message.error);
        setError(message.error);
        setIsProcessing(false);
        setCurrentSessionId(null);

        // Update current message with error
        if (currentMessageIdRef.current) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === currentMessageIdRef.current
                ? { ...msg, error: message.error, isProcessing: false }
                : msg
            )
          );
          currentMessageIdRef.current = null;
        }
        break;

      case 'historyCleared':
        console.log('[useAgentStream] History cleared - useAgentStream.ts:73');
        setMessages([]);
        setError(null);
        break;
    }
  }, []);

  /**
   * Handle individual agent events
   */
  const handleAgentEvent = useCallback((event: AgentEvent) => {
    const messageId = currentMessageIdRef.current;

    console.log('[useAgentStream] Agent event received:', event.type, 'messageId:', messageId);

    if (!messageId) {
      console.warn('[useAgentStream] ⚠️ DROPPING EVENT - No active session! Event:', event.type);
      console.warn('[useAgentStream] This means the UI will be stuck. Ref was:', messageId);
      return;
    }

    setMessages((prev) => {
      // Find the message - if it doesn't exist yet (race condition), ignore this event
      const messageExists = prev.some(msg => msg.id === messageId);
      if (!messageExists) {
        console.log('[useAgentStream] Message not in state yet (race condition), ignoring event: - useAgentStream.ts:96', event.type);
        return prev;
      }

      return prev.map((msg) => {
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
      });
    });

    // Stop processing when done
    if (event.type === 'done' || event.type === 'tool_error') {
      console.log('[useAgentStream] ✅ Session complete, clearing refs. Was:', messageId);
      currentSessionIdRef.current = null;
      currentMessageIdRef.current = null;
      setIsProcessing(false);
      setCurrentSessionId(null);
    }
  }, []);

  // Set up VS Code messaging
  const { sendQuery: sendQueryToExtension, cancelQuery, clearHistory: clearHistoryInExtension } = useVSCodeMessaging({
    onMessage: handleExtensionMessage
  });

  // Cancel any running sessions when webview first loads
  useEffect(() => {
    console.log('[useAgentStream] Webview mounted, canceling any stale sessions');
    cancelQuery();
  }, []); // Empty deps = runs once on mount

  /**
   * Send a new message to the agent
   */
  const sendMessage = useCallback(async (query: string, userId?: string) => {
    console.log('[useAgentStream] ═══════════════════════════════════════ - useAgentStream.ts:142');
    console.log('[useAgentStream] 📤 sendMessage called - useAgentStream.ts:143');
    console.log('[useAgentStream]    Query: - useAgentStream.ts:144', query);
    console.log('[useAgentStream]    UserId: - useAgentStream.ts:145', userId || 'anonymous');
    console.log('[useAgentStream]    isProcessing: - useAgentStream.ts:146', isProcessing);
    console.log('[useAgentStream] ═══════════════════════════════════════ - useAgentStream.ts:147');

    if (isProcessing) {
      console.error('[useAgentStream] ❌ Already processing a message - useAgentStream.ts:150');
      throw new Error('Already processing a message');
    }

    if (!query.trim()) {
      console.error('[useAgentStream] ❌ Query is empty - useAgentStream.ts:155');
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

    // Set ref BEFORE state to ensure it's available when events arrive
    currentMessageIdRef.current = messageId;
    setMessages((prev) => [...prev, newMessage]);

    console.log('[useAgentStream] ✅ Message created:', messageId);
    console.log('[useAgentStream] ✅ Ref set to:', currentMessageIdRef.current);

    try {
      // Send query to extension
      console.log('[useAgentStream] 🚀 Sending query to extension... - useAgentStream.ts:180');
      sendQueryToExtension(query.trim(), userId);
      console.log('[useAgentStream] ✅ Query sent to extension - useAgentStream.ts:182');
    } catch (err) {
      console.error('[useAgentStream] ❌ Failed to send query: - useAgentStream.ts:184', err);
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
  }, [isProcessing, sendQueryToExtension]);

  /**
   * Cancel the current running message
   */
  const cancelMessage = useCallback(() => {
    console.log('[useAgentStream] Cancelling message - useAgentStream.ts:207');
    cancelQuery();
  }, [cancelQuery]);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    console.log('[useAgentStream] Clearing messages - useAgentStream.ts:215');
    clearHistoryInExtension();
  }, [clearHistoryInExtension]);

  return {
    messages,
    isProcessing,
    error,
    sendMessage,
    cancelMessage,
    clearMessages,
  };
}
