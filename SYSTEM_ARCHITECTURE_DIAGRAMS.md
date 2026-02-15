# Dexter AI Agent - System Architecture Diagrams

This document explains the three system architecture diagrams for the Dexter AI Agent platform.

## Overview

Dexter is a multi-channel AI agent platform that supports:
- **CLI Terminal** (Bun runtime with React Ink UI)
- **Web Browser** (React SPA with real-time SSE streaming)
- **WhatsApp** (via Baileys library for WhatsApp Business API)

## Diagram 1: Complete System Architecture
**File:** [dexter_architecture.png](dexter_architecture.png)

This comprehensive diagram shows all components, layers, and their relationships:

### Client Layer (Blue)
- **CLI Terminal**: Direct access using Bun runtime and React Ink for terminal UI
- **Web Browser**: React Single Page Application running on localhost:5173
- **WhatsApp Client**: Mobile app connecting via WhatsApp Business API

### Gateway Layer (Purple)
- **HTTP Gateway** (Port 3000)
  - Express server handling REST API endpoints
  - `/api/chat` - POST endpoint to create chat sessions
  - `/api/chat/:sessionId/stream` - GET endpoint for SSE streaming
  - Connection Manager tracks active SSE connections
  - CORS support for web client

- **WhatsApp Gateway**
  - Baileys library for WhatsApp multi-device support
  - QR code authentication
  - Session management with Redis
  - Inbound/outbound message handling

### Agent Core Layer (Green)
- **Agent Runner**
  - Session management per user/channel
  - Message queue with serialized execution per session
  - InMemoryChatHistory for conversation context

- **Agent Loop** (max 10 iterations)
  - Prompt Builder: Constructs prompts with conversation context
  - Tool Orchestrator: Manages tool call execution
  - Context Manager: Manages token threshold (100k limit)
  - Event Streaming: Real-time event emission

- **Scratchpad**: JSONL logging for debugging and audit trail

### LLM Integration Layer (Orange)
- **Credential Management**
  - Token Manager: Centralized credential handling
  - macOS Keychain: Secure API key storage
  - Environment Variables: Configuration via .env
  - Azure Managed Identity: Token-less Azure OpenAI access

- **LLM Service**
  - Multi-provider support (9 providers)
  - Provider selection and routing
  - Token usage tracking

### Tools & Skills Layer (Pink)
- **Tool System**
  - Tool Registry: Dynamic tool loading
  - Tool Executor: Executes tools with progress streaming
  - ProgressChannel: Real-time progress updates

- **Built-in Tools**
  - `web_search`: Exa, Perplexity, Tavily integration
  - `web_fetch`: URL content extraction
  - `browser`: Playwright automation
  - `financial_search`, `financial_metrics`, `read_filings`: Financial data tools

- **Skills System**
  - Skill Loader: Loads custom workflows
  - DCF Valuation: Complex financial analysis workflow
  - Custom skill instructions for specialized tasks

### Data Storage Layer (Teal)
- `.dexter/settings.json`: Provider and model configuration
- `.dexter/messages/chat_history.json`: Persistent conversation history
- `.dexter/scratchpad/*.jsonl`: Per-query execution logs
- `.env`: API keys and secrets

### External Services Layer (Red)
- **LLM Providers**
  - Azure OpenAI (with Managed Identity support)
  - Anthropic Claude (with prompt caching)
  - OpenAI GPT-4
  - Google Gemini
  - Ollama (local LLM)
  - xAI, OpenRouter, Moonshot, DeepSeek

- **External APIs**
  - Search APIs: Exa, Perplexity, Tavily
  - Financial APIs: Market data providers
  - SEC EDGAR: Filings database

---

## Diagram 2: Simplified Data Flow
**File:** [dexter_dataflow.png](dexter_dataflow.png)

This diagram focuses on the main data flow through the system, showing how messages flow from users to the agent and back.

### Data Flow Steps

1. **User Input** (Blue arrows)
   - CLI sends messages directly to Agent Runner
   - Web sends HTTP POST to HTTP Gateway → Agent Runner
   - WhatsApp sends messages via WhatsApp Gateway → Agent Runner

2. **Agent Execution** (Green arrows)
   - Agent Runner creates/retrieves session with conversation history
   - Agent Loop executes with context from Chat History

3. **LLM Processing** (Orange arrows)
   - Agent Loop sends prompt to LLM Service
   - LLM Service uses credentials from Keychain/environment
   - LLM calls external providers (Azure, Claude, OpenAI, etc.)

4. **Tool Execution** (Purple arrows)
   - Agent Loop calls Tool Executor for tool operations
   - Tools call external APIs (Search, Finance, SEC)
   - Skill System handles complex workflows

5. **Response Streaming** (Cyan arrows)
   - Agent Loop streams events back to clients:
     - `thinking`: LLM reasoning
     - `tool_start`, `tool_progress`, `tool_end`: Tool execution
     - `done`: Final answer with metrics
   - Web receives events via SSE connection
   - CLI receives events directly via EventEmitter
   - WhatsApp receives messages via WhatsApp Gateway

6. **Persistence** (Gray dotted arrows)
   - Agent Runner saves conversations to persistent storage
   - Settings, history, and scratchpad saved to `.dexter/`

---

## Diagram 3: Component Architecture
**File:** [dexter_components.png](dexter_components.png)

This diagram shows the detailed component breakdown within each layer.

### Layer 1: User Interfaces
- **CLI Terminal**
  - React Ink UI: Terminal-based React components
  - Custom Hooks: `useModelSelection`, `useAgentRunner`, `useInputHistory`

- **Web Application**
  - React SPA: Modern web interface
  - `useAgentStream`: Manages chat state and message submission
  - `useSSE`: Handles Server-Sent Events connection
  - API Service: HTTP client for REST endpoints

- **WhatsApp**
  - Mobile Client: Standard WhatsApp application

### Layer 2: Gateway & Routing
- **HTTP Channel**
  - Express Server: Node.js/Express HTTP server
  - REST Endpoints: `/api/chat` for session creation
  - SSE Endpoint: `/stream` for real-time events
  - Connection Manager: Tracks active SSE connections

- **WhatsApp Channel**
  - Baileys Library: WhatsApp Web multi-device protocol
  - Message Handler: Processes inbound/outbound messages
  - Session Store: Redis-based session management

### Layer 3: Agent Core
- **Agent Runner**
  - `runAgentForMessage`: Main entry point for message processing
  - Session Map: Per-user/channel session isolation

- **Agent Class**
  - `Agent.create()`: Factory method for agent instances
  - `Agent.run()`: Async generator for event streaming
  - AgentExecutor: Orchestrates LLM calls and tool execution

- **Context Management**
  - InMemoryChatHistory: Conversation context with relevance matching
  - Scratchpad: JSONL logging for debugging
  - TokenCounter: Tracks token usage and manages context threshold

### Layer 4: LLM Integration
- **LLM Service**
  - `getChatModel()`: Retrieves configured LLM instance
  - `callLlm()`: Executes LLM calls with retry logic
  - Model Factories: Support for 9 different providers

- **Credentials**
  - TokenManager: Manages API keys from keychain/environment
  - Azure Identity: Managed Identity and Azure CLI credentials

### Layer 5: Tools & Skills
- **Tool System**
  - `getTools()`: Dynamically loads available tools based on configuration
  - AgentToolExecutor: Executes tools with abort signal support
  - ProgressChannel: Async iterator for real-time progress updates

- **Skills**
  - Skill Registry: Discovers available skills
  - Skill Loader: Loads skill instructions for complex workflows

---

## Key Architectural Patterns

### Event-Driven Architecture
- Uses EventEmitter and async generators for real-time updates
- Events flow from Agent Loop to all connected clients
- Non-blocking, concurrent message processing

### Session Isolation
- Each user/channel combination gets its own session
- Sessions maintain independent conversation context
- Serialized execution per session prevents race conditions

### Multi-Channel Support
- Single agent core serves multiple interfaces
- Gateway layer abstracts channel-specific details
- Unified event model across all channels

### Streaming & Real-Time Updates
- SSE (Server-Sent Events) for web clients
- Direct EventEmitter for CLI
- WhatsApp messages for mobile
- ProgressChannel for tool execution progress

### Context Management
- 100k token threshold for context
- Automatic cleanup of old tool results (keeps last 5)
- InMemoryChatHistory with relevance matching
- Full context restored for final answer generation

### Credential Security
- macOS Keychain for secure API key storage
- Azure Managed Identity for token-less Azure access
- Environment variables with dotenv
- No credentials in code or version control

---

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Runtime** | Bun (CLI), Node.js (Gateways) |
| **Language** | TypeScript |
| **UI Frameworks** | React + Ink (CLI), React (Web) |
| **Web Server** | Express.js |
| **Real-time** | Server-Sent Events (SSE) |
| **LLM Integration** | LangChain |
| **State Management** | React Hooks, In-memory stores |
| **Messaging** | Baileys (WhatsApp) |
| **Web Automation** | Playwright |
| **Storage** | JSON/JSONL files |
| **Security** | Azure Identity, macOS Keychain |

---

## Message Flow Example

### Web Client Sending a Message

1. User types query in web interface → `ChatContainer.handleSend()`
2. `useAgentStream.sendMessage()` called
3. HTTP POST to `http://localhost:3000/api/chat` with query
4. HTTP Gateway receives request, creates session ID
5. Returns `{ sessionId, streamUrl }` to client
6. Client opens SSE connection to `/api/chat/:sessionId/stream`
7. HTTP Gateway dispatches message to Agent Runner
8. Agent Runner:
   - Retrieves/creates session with conversation history
   - Queues message (serialized per session)
   - Calls `Agent.run(query, history)`
9. Agent Loop (iterates up to 10 times):
   - Builds prompt with context from InMemoryChatHistory
   - Calls LLM with available tools
   - If LLM requests tool call:
     - Emits `tool_start` event
     - Executes tool via Tool Executor
     - Emits `tool_progress` events (real-time)
     - Emits `tool_end` event with results
     - Builds next prompt with tool results
   - If context > 100k tokens: clears old tool results
   - Continues until LLM ready for final answer
10. Agent calls LLM without tools for final answer
11. Emits `done` event with answer and metrics
12. Events streamed via SSE to web client
13. `useAgentStream` receives events, updates message state
14. UI displays answer and tool execution timeline

### CLI Direct Access

1. User types query in terminal → `CLI.handleSubmit()`
2. `useAgentRunner.runQuery()` called directly
3. Creates `Agent.run()` async generator
4. For each event:
   - Updates UI state immediately (no network latency)
   - `WorkingIndicator` shows tool execution
   - `HistoryItemView` displays events
5. Final answer displayed with metrics

### WhatsApp Message

1. User sends WhatsApp message
2. Baileys library receives webhook event
3. WhatsApp Gateway parses message
4. Dispatches to Agent Runner (same as HTTP flow)
5. Agent processes message
6. Events converted to WhatsApp messages
7. Sent back via Baileys → WhatsApp Business API

---

## Performance Optimizations

### Anthropic Prompt Caching
- System prompt marked with `cache_control: { type: 'ephemeral' }`
- 90% cost reduction on subsequent calls
- Implemented in `buildAnthropicMessages()`

### Azure Token Caching
- Tokens cached for 5 minutes
- Reduces auth overhead
- Automatic refresh before expiry

### Context Management
- Threshold: 100k tokens
- Keeps last 5 tool results when threshold exceeded
- Full context preserved for final answer

### Session Isolation
- Concurrent processing across different users
- Serialized execution per user prevents context mixing
- In-memory conversation history for fast access

---

## Deployment Considerations

### Local Development
- CLI runs directly with `bun run start`
- Web dev server: `cd src/web/client && npm run dev` (port 5173)
- HTTP Gateway: `npm run http-gateway` (port 3000)

### Production
- HTTP Gateway can run as systemd service or Docker container
- Web client can be built and served via nginx/CDN
- WhatsApp Gateway requires persistent connection (PM2/systemd)
- Environment variables via `.env` or secret management
- Azure Managed Identity eliminates need for API key rotation

---

## Security

### Credential Management
- API keys stored in macOS Keychain (not in files)
- Azure Managed Identity for Azure OpenAI (no keys needed)
- Environment variables for other providers
- `.env` file excluded from git

### Network Security
- CORS configured for trusted origins only
- No authentication in MVP (localhost only)
- Production should add JWT/OAuth2

### Data Privacy
- Conversation history stored locally (`.dexter/`)
- No data sent to external services except LLM providers
- Scratchpad logs can be disabled in production

---

## Extending the System

### Adding a New Tool
1. Create tool in `src/tools/`
2. Register in `src/tools/registry.ts`
3. Optionally implement ProgressChannel for real-time updates

### Adding a New LLM Provider
1. Add factory to `MODEL_FACTORIES` in `src/model/llm.ts`
2. Register provider in `src/providers.ts`
3. Update UI options

### Adding a New Channel
1. Create channel plugin in `src/gateway/channels/`
2. Implement `startAccount()` method
3. Dispatch messages to Agent Runner
4. Convert agent events to channel-specific format

---

**Last Updated:** 2026-02-14
**Diagrams Generated:** 2026-02-14
**Architecture Version:** 2026.2.14
