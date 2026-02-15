/**
 * HTTP Gateway Agent for VSCode Extension
 *
 * This agent calls the Dexter HTTP Gateway (Express server on localhost:3000)
 * to access the full skill system and capabilities of the parent Dexter project.
 */

import type { AgentEvent } from '../shared/types.js';

export interface HttpGatewayAgentConfig {
  gatewayUrl?: string; // Default: http://localhost:3000
  signal?: AbortSignal;
}

export class HttpGatewayAgent {
  private gatewayUrl: string;
  private signal?: AbortSignal;

  constructor(config: HttpGatewayAgentConfig = {}) {
    this.gatewayUrl = config.gatewayUrl ?? 'http://localhost:3000';
    this.signal = config.signal;
  }

  static create(config: HttpGatewayAgentConfig = {}): HttpGatewayAgent {
    return new HttpGatewayAgent(config);
  }

  /**
   * Run query through HTTP Gateway
   * Connects to the Express server which has the full Dexter Agent with skills
   */
  async *run(query: string): AsyncGenerator<AgentEvent> {
    const startTime = Date.now();

    try {
      // Yield thinking event
      yield {
        type: 'thinking',
        message: 'Connecting to Dexter HTTP Gateway...'
      };

      console.log('[HttpGatewayAgent] Connecting to:', this.gatewayUrl);

      // Step 1: POST to /api/chat to create session
      const chatResponse = await fetch(`${this.gatewayUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          userId: 'vscode-extension',
        }),
        signal: this.signal,
      });

      if (!chatResponse.ok) {
        throw new Error(`HTTP Gateway error: ${chatResponse.status} ${chatResponse.statusText}`);
      }

      // Parse session info
      const { sessionId, streamUrl } = await chatResponse.json() as { sessionId: string; streamUrl: string };
      console.log('[HttpGatewayAgent] Session created:', sessionId);
      console.log('[HttpGatewayAgent] Connecting to stream:', streamUrl);

      // Step 2: Connect to SSE stream
      const response = await fetch(`${this.gatewayUrl}${streamUrl}?userId=vscode-extension`, {
        signal: this.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP Gateway stream error: ${response.status} ${response.statusText}`);
      }

      console.log('[HttpGatewayAgent] Connected to stream, receiving events...');

      // Yield answer start
      yield {
        type: 'answer_start'
      };

      // Parse SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        if (this.signal?.aborted) {
          reader.cancel();
          throw new Error('Aborted');
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process SSE events in buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove 'data: ' prefix

            if (data === '[DONE]') {
              continue;
            }

            try {
              const event = JSON.parse(data) as AgentEvent;

              // Accumulate answer for final event
              if (event.type === 'done' && 'answer' in event) {
                fullResponse = event.answer;
              }

              // Forward event to extension
              yield event;

              console.log('[HttpGatewayAgent] Event:', event.type);
            } catch (e) {
              console.error('[HttpGatewayAgent] Failed to parse event:', data, e);
            }
          }
        }
      }

      // If we didn't get a done event, create one
      if (!fullResponse) {
        const totalTime = Date.now() - startTime;
        yield {
          type: 'done',
          answer: fullResponse,
          iterations: 1,
          totalTime
        };
      }

      console.log('[HttpGatewayAgent] Stream completed');

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message === 'Aborted') {
          throw error;
        }

        // Check if it's a connection error
        if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
          throw new Error(
            `Cannot connect to Dexter HTTP Gateway at ${this.gatewayUrl}\n\n` +
            `Please ensure the HTTP Gateway is running:\n` +
            `  cd /Users/ghu/aiworker/dexter\n` +
            `  npm run dev\n\n` +
            `Or switch to Direct Mode in VSCode settings.`
          );
        }
      }

      throw error;
    }
  }
}
