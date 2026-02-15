import type { ChannelPlugin } from '../types.js';
import type { HttpAccountConfig, HttpInboundMessage } from './types.js';
import { startHttpServer } from './server.js';
import { connectionManager } from './connection-manager.js';
import { logger } from '../../../utils/logger.js';
import type { AgentEvent } from '../../../agent/types.js';

/**
 * Configuration interface for HTTP channel
 * Extends gateway config with http channel settings
 */
export interface HttpChannelConfig {
  gateway: {
    accountId: string;
    heartbeatSeconds?: number;
    logLevel?: string;
  };
  channels: {
    http: {
      enabled: boolean;
      accounts: Record<string, HttpAccountConfig>;
    };
  };
  bindings?: Array<{
    agentId: string;
    match: {
      channel: string;
      accountId: string;
    };
  }>;
}

/**
 * Create HTTP channel plugin
 *
 * @param params.loadConfig - Function to load gateway configuration
 * @param params.onMessage - Callback for inbound messages
 * @returns ChannelPlugin instance for HTTP channel
 */
export function createHttpPlugin(params: {
  loadConfig: () => HttpChannelConfig;
  onMessage: (msg: HttpInboundMessage) => Promise<void>;
}): ChannelPlugin<HttpChannelConfig, HttpAccountConfig> {
  return {
    id: 'http',

    config: {
      /**
       * List all HTTP account IDs
       */
      listAccountIds: (cfg) => {
        return Object.keys(cfg.channels.http.accounts);
      },

      /**
       * Resolve HTTP account config by ID
       */
      resolveAccount: (cfg, accountId) => {
        const account = cfg.channels.http.accounts[accountId];
        if (!account) {
          throw new Error(`HTTP account not found: ${accountId}`);
        }
        return account;
      },

      /**
       * Check if account is enabled
       */
      isEnabled: (account, cfg) => {
        return account.enabled && cfg.channels.http.enabled !== false;
      },

      /**
       * Check if account is configured
       */
      isConfigured: async (account) => {
        return Boolean(account.port && account.host);
      },
    },

    gateway: {
      /**
       * Start HTTP server for this account
       */
      startAccount: async (ctx) => {
        logger.info(`[HTTP Plugin] Starting account: ${ctx.accountId}`);

        try {
          await startHttpServer(ctx.account, async (inboundMessage) => {
            try {
              // Pass to gateway handler
              await params.onMessage(inboundMessage);

            } catch (error) {
              logger.error(`[HTTP Plugin] Error handling message: ${error}`);

              // Send error event to client
              connectionManager.sendEvent(inboundMessage.sessionId, {
                event: 'error',
                data: {
                  type: 'error' as any,
                  message: error instanceof Error ? error.message : String(error),
                } as AgentEvent,
              });
            }
          });

          // Update status
          ctx.setStatus({
            connected: true,
            lastError: null,
          });

          logger.info(`[HTTP Plugin] Account started: ${ctx.accountId} on ${ctx.account.host}:${ctx.account.port}`);

          // Keep the account running until abort signal
          await new Promise<void>((resolve) => {
            ctx.abortSignal.addEventListener('abort', () => {
              logger.info(`[HTTP Plugin] Stopping account: ${ctx.accountId}`);
              resolve();
            });
          });

        } catch (error) {
          logger.error(`[HTTP Plugin] Failed to start account ${ctx.accountId}:`, error);

          ctx.setStatus({
            connected: false,
            lastError: error instanceof Error ? error.message : String(error),
          });

          throw error;
        }
      },
    },

    status: {
      /**
       * Default runtime status
       */
      defaultRuntime: {
        accountId: 'default',
        running: false,
        connected: false,
        lastError: null,
      },
    },
  };
}

/**
 * Send agent event to SSE client
 *
 * This is called by the gateway/agent-runner to stream events to the client
 */
export function sendEventToClient(sessionId: string, event: AgentEvent): void {
  connectionManager.sendEvent(sessionId, {
    event: event.type,
    data: event,
  });
}
