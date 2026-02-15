# Dexter AI Agent - System Architecture Diagrams (Updated 2026)

This document explains the complete system architecture diagrams for the Dexter AI Agent platform, including the newly documented **Evals system**.

## Overview

Dexter is a multi-channel AI agent platform that supports **FOUR interfaces**:
- **CLI Terminal** (Bun runtime with React Ink UI) - Interactive Q&A
- **Web Browser** (React SPA with real-time SSE streaming) - Browser-based chat
- **WhatsApp** (via Baileys library for WhatsApp Business API) - Mobile messaging
- **Evals Terminal** ⭐ NEW - Batch testing & quality assurance with LangSmith tracking

## 🆕 Updated System Architecture Diagram (2026)
**File:** [dexter_system_architecture_2026.png](dexter_system_architecture_2026.png)

This comprehensive diagram now includes all four interfaces and clearly shows the **two access patterns**:

### Key Architecture Highlights

#### Two Access Patterns

**1. Gateway Pattern** (Web, WhatsApp)
- ✅ Multi-session support
- ✅ Concurrent users
- ✅ Session isolation
- ✅ Message queuing
- 📡 Network-based communication (HTTP/SSE, WhatsApp API)

**2. Direct Pattern** ⭐ (CLI, Evals)
- ✅ Zero network latency
- ✅ Direct Agent.create() invocation
- ✅ In-process event streaming
- ✅ No gateway overhead
- 🚀 Maximum performance

#### Seven Architectural Layers

**Layer 1: CLIENT LAYER** (Blue) - User Interfaces
- CLI Terminal - Interactive terminal for development/research
- Web Browser - React SPA on localhost:5173
- WhatsApp - Mobile messaging integration
- **Evals Terminal** ⭐ NEW - Batch testing with terminal UI

**Layer 2: GATEWAY LAYER** (Purple) - Channel Gateways
- HTTP Gateway (Port 3000) - Express + SSE for web clients
- WhatsApp Gateway - Baileys library integration
- **Note:** CLI and Evals bypass this layer entirely

**Layer 3: AGENT CORE LAYER** (Green) - AI Agent Engine
- Agent Runner - Session management, message queue
- Agent Class - Agent.create(), Agent.run()
- Agent Loop - Max 10 iterations, context management
- Scratchpad - JSONL logging for debugging

**Layer 4: LLM INTEGRATION LAYER** (Orange) - Language Model Services
- LLM Service - Multi-provider router (9 providers)
- Token Manager - Credential management
- Credential Sources - macOS Keychain, Azure Managed Identity, .env

**Layer 5: TOOLS & SKILLS LAYER** (Pink) - Agent Capabilities
- Tool Registry - Dynamic loading
- Tool Executor - Progress streaming
- Skills System - Complex workflows (e.g., DCF valuation)
- Built-in Tools - web_search, financial_metrics, read_filings, browser

**Layer 6: EXTERNAL SERVICES LAYER** (Red) - Third-Party APIs
- LLM Providers - Azure OpenAI, Anthropic Claude, OpenAI GPT, Google Gemini, Ollama
- Data APIs - Financial Datasets, Exa Search, Tavily Search, SEC EDGAR
- **LangSmith** ⭐ - Evals tracking, experiments, datasets

**Layer 7: DATA STORAGE LAYER** (Teal) - Persistence
- .dexter/settings.json - Provider and model configuration
- .dexter/messages/ - Chat history
- .dexter/scratchpad/ - JSONL logs
- .env - API keys and secrets

---

## 🆕 Evals System Architecture

### What is the Evals System?

The Evals system is a **batch testing and quality assurance framework** that:
- Loads test datasets from CSV files
- Runs the agent against each question
- Uses **LLM-as-judge** to score correctness (0-1 scale)
- Tracks results in LangSmith for analysis
- Displays real-time progress in a terminal UI

### Evals Components

```
src/evals/
├── run.ts                      # Entry point, dataset loading, LangSmith integration
├── components/
│   ├── EvalApp.tsx            # Main Ink UI component (terminal)
│   ├── EvalProgress.tsx       # Progress bar
│   ├── EvalCurrentQuestion.tsx # Current question display
│   ├── EvalStats.tsx          # Live statistics (correct/incorrect)
│   └── EvalRecentResults.tsx  # Recent results list
└── dataset/
    └── finance_agent.csv      # Test questions + expected answers
```

### Evals Data Flow

```
1. User runs: bun run src/evals/run.ts [--sample 10]
2. run.ts loads dataset CSV (finance_agent.csv)
3. For each question:
   a. target() calls Agent.create({ model: 'gpt-5.2', maxIterations: 10 })
   b. Agent.run(question) executes and returns answer
   c. correctnessEvaluator() uses GPT-5.2 as judge to score answer
   d. Result logged to LangSmith with metadata
   e. UI updates with progress, stats, and recent results
4. Summary displayed with average score and per-question breakdown
5. LangSmith experiment URL provided for detailed analysis
```

### Key Code: Direct Agent Invocation

```typescript
// From src/evals/run.ts:144-155
async function target(inputs: { question: string }): Promise<{ answer: string }> {
  const agent = Agent.create({ model: 'gpt-5.2', maxIterations: 10 });
  let answer = '';

  for await (const event of agent.run(inputs.question)) {
    if (event.type === 'done') {
      answer = event.answer;
    }
  }

  return { answer };
}
```

**This is the key difference:** Evals directly call `Agent.create()` and `Agent.run()`, bypassing the gateway layer entirely.

### LLM-as-Judge Scoring

```typescript
// From src/evals/run.ts:173-212
async function correctnessEvaluator({
  outputs,
  referenceOutputs,
}: {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  referenceOutputs?: Record<string, unknown>;
}): Promise<EvaluationResult> {
  const actualAnswer = (outputs?.answer as string) || '';
  const expectedAnswer = (referenceOutputs?.answer as string) || '';

  const prompt = `You are evaluating the correctness of an AI assistant's answer...

  Expected Answer: ${expectedAnswer}
  Actual Answer: ${actualAnswer}

  Evaluate and provide:
  - score: 1 if correct, 0 if incorrect
  - comment: brief explanation`;

  const result = await structuredLlm.invoke(prompt);
  return {
    key: 'correctness',
    score: result.score,
    comment: result.comment,
  };
}
```

### Evals vs CLI: Same Terminal, Different Purpose

| Feature | CLI Terminal | Evals Terminal |
|---------|-------------|----------------|
| **Purpose** | Interactive Q&A | Batch testing |
| **UI Framework** | Ink (React for terminal) | Ink (React for terminal) |
| **Entry Point** | `src/index.tsx` | `src/evals/run.ts` |
| **Agent Access** | Direct `Agent.create()` | Direct `Agent.create()` |
| **Input Source** | User keyboard | CSV dataset |
| **Output** | Terminal display | Terminal UI + LangSmith |
| **Mode** | Interactive, one question at a time | Batch, sequential processing |
| **Persistence** | `.dexter/messages/` | LangSmith experiments |
| **Use Case** | Daily development/research | Quality assurance, regression testing |

---

## Original Diagrams (Pre-2026 Update)

### Diagram 1: Complete System Architecture (Original)
**File:** [dexter_architecture.png](dexter_architecture.png)

**Note:** This diagram shows the original three-interface architecture (CLI, Web, WhatsApp) without the Evals system. Refer to [dexter_system_architecture_2026.png](dexter_system_architecture_2026.png) for the updated four-interface version.

### Diagram 2: Simplified Data Flow
**File:** [dexter_dataflow.png](dexter_dataflow.png)

This diagram focuses on the main data flow through the system for the original three interfaces.

### Diagram 3: Component Architecture
**File:** [dexter_components.png](dexter_components.png)

This diagram shows the detailed component breakdown within each layer for the original architecture.

---

## Key Architectural Patterns

### Event-Driven Architecture
- Uses EventEmitter and async generators for real-time updates
- Events flow from Agent Loop to all connected clients
- Non-blocking, concurrent message processing

### Session Isolation (Gateway Pattern Only)
- Each user/channel combination gets its own session
- Sessions maintain independent conversation context
- Serialized execution per session prevents race conditions
- **Note:** Not applicable to CLI/Evals (single-user, direct access)

### Multi-Channel Support
- Single agent core serves multiple interfaces
- Gateway layer abstracts channel-specific details (for Web/WhatsApp)
- Direct access for CLI/Evals eliminates gateway overhead
- Unified event model across all channels

### Streaming & Real-Time Updates
- **Web:** SSE (Server-Sent Events) for browser clients
- **WhatsApp:** Message-based updates via WhatsApp Gateway
- **CLI:** Direct EventEmitter in-process
- **Evals:** AsyncGenerator with progress events to terminal UI
- **All:** ProgressChannel for tool execution progress

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
| **Runtime** | Bun (CLI, Evals), Node.js (Gateways) |
| **Language** | TypeScript |
| **UI Frameworks** | React + Ink (CLI, Evals), React (Web) |
| **Web Server** | Express.js |
| **Real-time** | Server-Sent Events (SSE) |
| **LLM Integration** | LangChain |
| **State Management** | React Hooks, In-memory stores |
| **Messaging** | Baileys (WhatsApp) |
| **Web Automation** | Playwright |
| **Evals & Tracking** | LangSmith |
| **Storage** | JSON/JSONL files |
| **Security** | Azure Identity, macOS Keychain |

---

## Message Flow Examples

### Web Client Sending a Message (Gateway Pattern)

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
   - Builds prompt with context
   - Calls LLM with available tools
   - Executes tools as needed
   - Streams events: `thinking`, `tool_start`, `tool_progress`, `tool_end`, `done`
10. Events streamed via SSE to web client
11. `useAgentStream` receives events, updates UI state
12. UI displays answer and tool execution timeline

### CLI Direct Access (Direct Pattern)

1. User types query in terminal → `CLI.handleSubmit()`
2. `useAgentRunner.runQuery()` called directly
3. Creates `Agent.run()` async generator **in-process**
4. For each event:
   - Updates UI state immediately (no network latency)
   - `WorkingIndicator` shows tool execution
   - `HistoryItemView` displays events
5. Final answer displayed with metrics

### Evals Batch Processing (Direct Pattern + LangSmith)

1. User runs: `bun run src/evals/run.ts --sample 10`
2. `run.ts` loads and parses `finance_agent.csv`
3. Creates LangSmith dataset and experiment
4. For each question in dataset:
   a. `target()` directly calls `Agent.create({ model: 'gpt-5.2' })`
   b. `Agent.run(question)` executes **in-process**
   c. Captures `done` event with answer
   d. `correctnessEvaluator()` uses GPT-5.2 to score answer
   e. Logs run to LangSmith with score and metadata
   f. Yields `question_end` event to UI
   g. `EvalApp` updates progress bar, stats, and recent results
5. Summary displayed with average score
6. LangSmith experiment URL provided for detailed analysis

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

### Session Isolation (Gateway Pattern)
- Concurrent processing across different users
- Serialized execution per user prevents context mixing
- In-memory conversation history for fast access

### Direct Access Performance (CLI, Evals)
- **Zero network overhead** - No HTTP/SSE serialization
- **In-process event streaming** - Direct AsyncGenerator
- **No session management overhead**
- **Optimal for single-user, high-throughput scenarios**

---

## Deployment Considerations

### Local Development
- **CLI:** `bun run start` (interactive)
- **Evals:** `bun run src/evals/run.ts` (batch testing)
- **Web:**
  - Dev server: `cd src/web/client && npm run dev` (port 5173)
  - HTTP Gateway: `npm run http-gateway` (port 3000)
  - Combined: `npm run web`

### Production
- HTTP Gateway can run as systemd service or Docker container
- Web client can be built and served via nginx/CDN
- WhatsApp Gateway requires persistent connection (PM2/systemd)
- Environment variables via `.env` or secret management
- Azure Managed Identity eliminates need for API key rotation
- **Evals:** Run via cron jobs or CI/CD pipelines for regression testing

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
- **Direct access (CLI/Evals):** No network exposure

### Data Privacy
- Conversation history stored locally (`.dexter/`)
- Evals results logged to LangSmith (configurable)
- No data sent to external services except LLM providers
- Scratchpad logs can be disabled in production

---

## Extending the System

### Adding a New Tool
1. Create tool in `src/tools/`
2. Register in `src/tools/registry.ts`
3. Optionally implement ProgressChannel for real-time updates
4. Tool automatically available to all interfaces (CLI, Web, WhatsApp, Evals)

### Adding a New LLM Provider
1. Add factory to `MODEL_FACTORIES` in `src/model/llm.ts`
2. Register provider in `src/providers.ts`
3. Update UI options
4. Available to all interfaces

### Adding a New Channel/Interface
1. Create channel plugin in `src/gateway/channels/`
2. Implement `startAccount()` method
3. Dispatch messages to Agent Runner
4. Convert agent events to channel-specific format

### Adding New Eval Datasets
1. Create CSV file in `src/evals/dataset/`
   - Format: `question,answer` (header row)
   - Support multi-line fields with quotes
2. Update `run.ts` to reference new dataset
3. Run evals: `bun run src/evals/run.ts`

---

## File Structure Summary

```
dexter/
├── src/
│   ├── index.tsx                  # CLI Terminal entry point (Interactive)
│   ├── cli/                       # CLI UI components (Ink)
│   ├── evals/                     # ⭐ NEW: Evals system
│   │   ├── run.ts                 # Evals entry point (Batch)
│   │   ├── components/
│   │   │   ├── EvalApp.tsx       # Main Evals UI (Ink)
│   │   │   ├── EvalProgress.tsx  # Progress bar
│   │   │   ├── EvalStats.tsx     # Live statistics
│   │   │   └── ...
│   │   └── dataset/
│   │       └── finance_agent.csv # Test dataset
│   ├── gateway/
│   │   ├── http-gateway.ts       # Web HTTP server
│   │   ├── agent-runner.ts       # Multi-session orchestration
│   │   └── channels/
│   │       ├── http/             # HTTP + SSE implementation
│   │       └── whatsapp/         # WhatsApp integration
│   ├── agent/
│   │   └── agent.ts              # Core Agent class (shared by all)
│   ├── model/
│   │   └── llm.ts                # LLM service (shared by all)
│   ├── tools/
│   │   └── registry.ts           # Tool system (shared by all)
│   └── web/
│       └── client/               # React SPA (browser)
├── dexter_architecture.png        # Original 3-interface diagram
├── dexter_dataflow.png           # Original data flow
├── dexter_components.png         # Original components
└── dexter_system_architecture_2026.png  # ⭐ NEW: Updated 4-interface diagram
```

---

## Comparison: Old vs New Architecture

| Aspect | Original (2024-2025) | Updated (2026) |
|--------|---------------------|----------------|
| **Interfaces** | 3 (CLI, Web, WhatsApp) | 4 (CLI, Web, WhatsApp, **Evals**) |
| **Access Patterns** | Gateway only | Gateway + **Direct** |
| **Testing** | Manual | **Automated with LangSmith** |
| **Quality Assurance** | Ad-hoc | **Systematic batch testing** |
| **Evaluation** | Manual inspection | **LLM-as-judge scoring** |
| **Experiment Tracking** | None | **LangSmith experiments** |
| **Terminal UIs** | 1 (CLI interactive) | 2 (CLI interactive + **Evals batch**) |
| **Documentation** | 3 diagrams | **4 diagrams + detailed Evals docs** |

---

**Last Updated:** 2026-02-15
**Diagrams Generated:** 2026-02-15
**Architecture Version:** 2026.2.15
**New Additions:** Evals system architecture, updated system diagram, Direct vs Gateway pattern documentation
