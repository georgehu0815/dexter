# Dexter CLI System Architecture

## Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Entry Point & CLI Flow](#entry-point--cli-flow)
3. [Component Hierarchy](#component-hierarchy)
4. [Agent Execution Flow](#agent-execution-flow)
5. [State Management](#state-management)
6. [Data Flow](#data-flow)
7. [LLM Integration](#llm-integration)
8. [Tool System](#tool-system)
9. [Storage & Persistence](#storage--persistence)
10. [Event System](#event-system)

---
Key Differences
Feature	Web App	Evals App
UI	React (Browser)	Ink (Terminal)
Server	HTTP Gateway (port 3000)	None
Agent Access	Via agent-runner.ts	Direct Agent.create()
Concurrent Users	✅ Multiple sessions	❌ Single run
Purpose	Interactive chat	Testing & evaluation
Streaming	SSE over HTTP	AsyncGenerator in-process
Logging	Console logs	LangSmith + terminal UI

1. Web App (Uses HTTP Gateway)


User Browser (localhost:5173)
         ↓
   React Frontend
         ↓ HTTP/SSE
   HTTP Gateway (localhost:3000) ← [http-gateway.ts]
         ↓
   Agent Runner → Agent.create()
         ↓
   Tools (finance, search, etc.)

2. Evals App (Terminal-only, No HTTP)


Terminal
    ↓
Ink UI (EvalApp.tsx) ← Terminal React components
    ↓
createEvaluationRunner() ← [run.ts]
    ↓
Agent.create() ← Direct agent invocation
    ↓
Tools (finance, search, etc.)
    ↓
LangSmith ← Logs results for tracking


## High-Level Architecture

```mermaid
graph TB
    subgraph "Entry Point"
        A[index.tsx<br/>Bun Runtime]
        A -->|Loads .env| B[dotenv config]
        A -->|Renders| C[CLI Component]
    end

    subgraph "CLI Layer (React/Ink)"
        C -->|Uses| D[useModelSelection]
        C -->|Uses| E[useAgentRunner]
        C -->|Uses| F[useInputHistory]
        C -->|Renders| G[UI Components]
    end

    subgraph "UI Components"
        G --> G1[Intro]
        G --> G2[ProviderSelector]
        G --> G3[ModelSelector]
        G --> G4[HistoryItemView]
        G --> G5[WorkingIndicator]
        G --> G6[Input]
        G --> G7[DebugPanel]
    end

    subgraph "Agent Layer"
        E -->|Creates| H[Agent]
        H -->|Executes| I[Agent Loop]
        I -->|Uses| J[LLM Service]
        I -->|Uses| K[Tool Executor]
        I -->|Manages| L[Scratchpad]
    end

    subgraph "Services"
        J -->|Calls| M[LLM Providers]
        K -->|Executes| N[Tool Registry]
        L -->|Persists| O[File System]
    end

    subgraph "Data Stores"
        O --> P[.dexter/settings.json]
        O --> Q[.dexter/scratchpad/*.jsonl]
        O --> R[.dexter/messages/chat_history.json]
        O --> S[.env]
    end

    subgraph "External Services"
        M --> T1[Azure OpenAI]
        M --> T2[Anthropic Claude]
        M --> T3[OpenAI]
        M --> T4[Google Gemini]
        M --> T5[Ollama Local]
        N --> U1[Web Search APIs]
        N --> U2[Financial Data APIs]
        N --> U3[Browser Automation]
    end

    style A fill:#e1f5fe
    style C fill:#b3e5fc
    style H fill:#81d4fa
    style M fill:#4fc3f7
    style O fill:#29b6f6
```

---

## Entry Point & CLI Flow

```mermaid
sequenceDiagram
    participant User
    participant Entry as index.tsx
    participant Env as dotenv
    participant CLI as CLI Component
    participant Ink as Ink Renderer

    User->>Entry: bun run start
    Entry->>Env: config({ quiet: true })
    Env-->>Entry: Environment loaded
    Entry->>Ink: render(<CLI />)
    Ink->>CLI: Mount component
    CLI->>CLI: Initialize hooks
    CLI->>CLI: Load settings.json
    CLI->>User: Display Intro

    loop User Interaction
        User->>CLI: Enter query
        CLI->>CLI: Handle input
        alt Command (/model, /exit)
            CLI->>CLI: Execute command
        else Regular query
            CLI->>CLI: Run agent
        end
        CLI->>User: Display result
    end

    User->>CLI: exit/quit
    CLI->>Ink: waitUntilExit()
    Ink->>Entry: Exit
    Entry-->>User: Process exit
```

---

## Component Hierarchy

```mermaid
graph TD
    A[CLI - Main Component<br/>src/cli.tsx]

    subgraph "Custom Hooks"
        B1[useModelSelection<br/>Model & Provider Management]
        B2[useAgentRunner<br/>Agent Execution & Events]
        B3[useInputHistory<br/>History Navigation]
    end

    A --> B1
    A --> B2
    A --> B3

    subgraph "UI State Management"
        C1[selectionState<br/>Model selection flow]
        C2[history<br/>Query/Answer pairs]
        C3[isWorking<br/>Processing state]
        C4[errorText<br/>Error display]
        C5[inputState<br/>User input & cursor]
    end

    B1 --> C1
    B2 --> C2
    B2 --> C3
    B2 --> C4
    B3 --> C5

    subgraph "Rendered Components"
        D1[Intro<br/>Provider info display]
        D2[ProviderSelector<br/>Choose LLM provider]
        D3[ModelSelector<br/>Choose model]
        D4[ApiKeyInput<br/>Enter API key]
        D5[HistoryItemView<br/>Query/Answer display]
        D6[WorkingIndicator<br/>Processing animation]
        D7[Input<br/>Text input with history]
        D8[DebugPanel<br/>Debug logs optional]
    end

    C1 --> D2
    C1 --> D3
    C1 --> D4
    C2 --> D5
    C3 --> D6
    C5 --> D7
    A --> D1
    A --> D8

    subgraph "Sub-Components"
        E1[EventListView<br/>Tool calls & thinking]
        E2[AnswerBox<br/>Formatted answer]
        E3[ShineText<br/>Animation effect]
        E4[CursorText<br/>Cursor rendering]
    end

    D5 --> E1
    D5 --> E2
    D6 --> E3
    D7 --> E4

    style A fill:#1976d2,color:#fff
    style B1 fill:#42a5f5
    style B2 fill:#42a5f5
    style B3 fill:#42a5f5
    style D5 fill:#90caf9
    style D6 fill:#90caf9
    style D7 fill:#90caf9
```

---

## Agent Execution Flow

```mermaid
graph TB
    Start([User submits query]) --> A[useAgentRunner.runQuery]
    A --> B[Create AbortController]
    B --> C[Add to history status: processing]
    C --> D[Save to InMemoryChatHistory]
    D --> E[Agent.create config]

    E --> F{Load Tools}
    F --> G[getTools model]
    G --> H[Build System Prompt]
    H --> I[Create AgentToolExecutor]

    I --> J[Agent.run query, history]
    J --> K[Build initial prompt<br/>with conversation context]

    K --> L{Agent Loop<br/>max 10 iterations}

    L --> M[Call LLM with prompt]
    M --> N{Has tool calls?}

    N -->|Yes| O[Emit thinking event]
    O --> P[Execute tools via<br/>AgentToolExecutor]
    P --> Q[Yield tool events:<br/>start → progress → end]
    Q --> R{Context threshold<br/>>100k tokens?}
    R -->|Yes| S[Clear oldest tool results<br/>keep last 5]
    R -->|No| T[Keep all results]
    S --> U[Build next prompt<br/>with tool results]
    T --> U
    U --> V{Max iterations<br/>reached?}
    V -->|No| L
    V -->|Yes| W[Force final answer]

    N -->|No| X[Ready for answer]
    X --> Y[Call LLM without tools<br/>for final answer]
    W --> Y

    Y --> Z[Emit done event<br/>with metrics]
    Z --> AA[Update InMemoryChatHistory<br/>with response]
    AA --> AB[Display answer in UI]
    AB --> End([Query complete])

    style Start fill:#4caf50
    style End fill:#4caf50
    style L fill:#ff9800
    style N fill:#ff9800
    style Y fill:#2196f3
    style Z fill:#2196f3
```

---

## State Management

```mermaid
graph LR
    subgraph "useModelSelection Hook"
        A1[selectionState] --> A2[provider]
        A1 --> A3[modelName]
        A1 --> A4[apiKey]
        A1 --> A5[stage]
        A2 --> A6[Persist to<br/>.dexter/settings.json]
        A3 --> A6
    end

    subgraph "useAgentRunner Hook"
        B1[history] --> B2[HistoryItem[]]
        B2 --> B3[query]
        B2 --> B4[events]
        B2 --> B5[answer]
        B2 --> B6[status]
        B2 --> B7[metrics]
    end

    subgraph "useInputHistory Hook"
        C1[messages] --> C2[Load from<br/>chat_history.json]
        C1 --> C3[Navigate with<br/>↑↓ arrows]
        C1 --> C4[Persist on<br/>new message]
    end

    subgraph "InMemoryChatHistory (Ref)"
        D1[chatHistory] --> D2[stores messages<br/>for context]
        D2 --> D3[LLM summarizes<br/>for relevance]
        D3 --> D4[Selects relevant<br/>past messages]
    end

    subgraph "Refs (Non-rendered State)"
        E1[abortControllerRef] --> E2[Cancel execution]
        E3[historyNavigationRef] --> E4[Track cursor<br/>position]
    end

    A6 -.->|Read on mount| A1
    C2 -.->|Read on mount| C1
    C4 -.->|Write on submit| C1

    style A1 fill:#e3f2fd
    style B1 fill:#e1f5fe
    style C1 fill:#e0f7fa
    style D1 fill:#e0f2f1
    style E1 fill:#f3e5f5
```

---

## Data Flow: User Input → Agent → Output

```mermaid
sequenceDiagram
    participant User
    participant Input as Input Component
    participant CLI as CLI.handleSubmit
    participant Runner as useAgentRunner
    participant History as InMemoryChatHistory
    participant Agent as Agent.run
    participant LLM as LLM Service
    participant Tools as Tool Executor
    participant UI as HistoryItemView

    User->>Input: Enter query + press Enter
    Input->>CLI: onSubmit(query)
    CLI->>CLI: Save to LongTermChatHistory
    CLI->>Runner: runQuery(query)
    Runner->>Runner: Create AbortController
    Runner->>UI: Add history item (status: processing)
    Runner->>History: addMessage(HumanMessage)
    Runner->>Agent: Agent.run(query, chatHistory)

    Agent->>Agent: Build prompt with context

    loop Agent Loop (max 10 iterations)
        Agent->>LLM: Call with tools
        LLM-->>Agent: Response with tool_calls
        Agent->>Runner: Emit thinking event
        Runner->>UI: Update working indicator

        loop For each tool
            Agent->>Tools: Execute tool
            Tools->>Runner: Emit tool_start
            Runner->>UI: Show tool execution
            Tools->>Runner: Emit tool_progress (realtime)
            Runner->>UI: Update progress message
            Tools-->>Agent: Tool result
            Agent->>Runner: Emit tool_end
            Runner->>UI: Mark tool complete
        end

        Agent->>Agent: Check context threshold
        alt Context > 100k tokens
            Agent->>Agent: Clear oldest results (keep 5)
        end

        Agent->>Agent: Build next prompt with results
    end

    Agent->>LLM: Call without tools (final answer)
    LLM-->>Agent: Final answer text
    Agent->>Runner: Emit done event + metrics
    Runner->>History: addMessage(AIMessage)
    Runner->>UI: Display answer + performance
    UI->>User: Show formatted result

    Note over User,UI: User can press Esc to abort at any time
```

---

## LLM Integration

```mermaid
graph TB
    subgraph "LLM Service (src/model/llm.ts)"
        A[getChatModel] --> B{Provider?}

        B -->|azureopenai| C1[Azure OpenAI Factory]
        B -->|anthropic| C2[Anthropic Factory]
        B -->|openai| C3[OpenAI Factory]
        B -->|google| C4[Google Gemini Factory]
        B -->|xai| C5[xAI Factory]
        B -->|openrouter| C6[OpenRouter Factory]
        B -->|moonshot| C7[Moonshot Factory]
        B -->|deepseek| C8[DeepSeek Factory]
        B -->|ollama| C9[Ollama Factory]

        C1 --> D1[ManagedIdentity<br/>AzureCliCredential]
        C2 --> D2[TokenManager<br/>keychain + env]
        C3 --> D3[API Key from env]
        C4 --> D3
        C5 --> D3
        C6 --> D3
        C7 --> D3
        C8 --> D3
        C9 --> D9[Local baseURL]
    end

    subgraph "callLlm Function"
        E[callLlm prompt, options] --> F{Output type?}
        F -->|structuredOutput| G[withStructuredOutput]
        F -->|tools| H[bindTools]
        F -->|none| I[raw invoke]

        G --> J[Invoke with retry]
        H --> J
        I --> J

        J --> K{Provider?}
        K -->|anthropic| L[Use cache_control<br/>90% savings]
        K -->|others| M[Use ChatPromptTemplate]

        L --> N[Extract usage]
        M --> N
        N --> O[Return response + usage]
    end

    subgraph "Authentication"
        P1[Azure: getAzureToken] --> P2[Token cache 5min]
        P3[Claude: TokenManager] --> P4[Keychain or env]
        P5[Others: getApiKey] --> P6[Env variable]
    end

    D1 -.-> P1
    D2 -.-> P3
    D3 -.-> P5

    style A fill:#1976d2,color:#fff
    style E fill:#1976d2,color:#fff
    style C2 fill:#42a5f5
    style D2 fill:#90caf9
    style L fill:#4caf50
```

---

## Tool System

```mermaid
graph TB
    subgraph "Tool Registry (src/tools/registry.ts)"
        A[getTools model] --> B{Check API keys}
        B --> C{Has web search key?}
        C -->|Yes| D1[Add web_search tool]
        C -->|No| D2[Skip web_search]

        B --> E[Always available tools]
        E --> E1[web_fetch]
        E --> E2[browser]
        E --> E3[financial_search]
        E --> E4[financial_metrics]
        E --> E5[read_filings]
        E --> E6[skill]
    end

    subgraph "Tool Execution (AgentToolExecutor)"
        F[Execute tool] --> G[Create ProgressChannel]
        G --> H[Emit tool_start event]
        H --> I[Invoke tool with args]
        I --> J{Tool has progress?}
        J -->|Yes| K[Drain progress messages]
        J -->|No| L[Wait for completion]
        K --> M[Emit tool_progress events]
        M --> L
        L --> N{Success?}
        N -->|Yes| O[Emit tool_end event]
        N -->|No| P[Emit tool_error event]
    end

    subgraph "Tool Definitions"
        T1[web_search<br/>Exa/Perplexity/Tavily]
        T2[web_fetch<br/>URL extraction]
        T3[browser<br/>Playwright automation]
        T4[financial_search<br/>Financial data]
        T5[financial_metrics<br/>Company metrics]
        T6[read_filings<br/>SEC filings parser]
        T7[skill<br/>Execute skills]
    end

    E1 -.-> T2
    E2 -.-> T3
    E3 -.-> T4
    E4 -.-> T5
    E5 -.-> T6
    E6 -.-> T7
    D1 -.-> T1

    subgraph "ProgressChannel"
        PC1[emit message] --> PC2[Queue message]
        PC2 --> PC3[Async iterator]
        PC3 --> PC4[Consumer drains]
    end

    G -.-> PC1
    K -.-> PC4

    style F fill:#ff6f00
    style I fill:#ff8f00
    style T1 fill:#ffa726
    style T2 fill:#ffa726
    style T3 fill:#ffa726
    style T4 fill:#ffa726
    style T5 fill:#ffa726
    style T6 fill:#ffa726
    style T7 fill:#ffa726
```

---

## Storage & Persistence

```mermaid
graph TB
    subgraph "Configuration Storage"
        A[.dexter/settings.json] --> A1[provider]
        A --> A2[modelName]
        A --> A3[Loaded on mount]
        A --> A4[Saved on change]
    end

    subgraph "API Keys"
        B[.env file] --> B1[ANTHROPIC_API_KEY]
        B --> B2[AZURE_OPENAI_*]
        B --> B3[OPENAI_API_KEY]
        B --> B4[GOOGLE_API_KEY]
        B --> B5[Other provider keys]

        B6[macOS Keychain] --> B7[Claude Code service]
        B7 --> B8[Retrieved by TokenManager]
    end

    subgraph "Chat History"
        C[.dexter/messages/chat_history.json] --> C1[All conversations]
        C1 --> C2[Stack ordering newest first]
        C1 --> C3[Used by ↑↓ navigation]
    end

    subgraph "Scratchpad Logs"
        D[.dexter/scratchpad/] --> D1[timestamp_hash.jsonl]
        D1 --> D2[init: query]
        D1 --> D3[thinking: LLM thoughts]
        D1 --> D4[tool_result: Each tool call]
        D1 --> D5[Append-only log]
    end

    subgraph "In-Memory State"
        E[InMemoryChatHistory] --> E1[Messages with summaries]
        E1 --> E2[Relevance matching]
        E1 --> E3[Context for multi-turn]
        E --> E4[Reset on model change]
    end

    style A fill:#e8f5e9
    style B fill:#fff3e0
    style B6 fill:#ffe0b2
    style C fill:#e1f5fe
    style D fill:#f3e5f5
    style E fill:#fce4ec
```

---

## Event System

```mermaid
sequenceDiagram
    participant Agent
    participant EventEmitter as Agent EventEmitter
    participant Runner as useAgentRunner
    participant UI as React UI
    participant User

    Note over Agent,User: Agent Execution with Real-time Events

    Agent->>EventEmitter: Emit 'thinking' event
    EventEmitter->>Runner: handleEvent(thinking)
    Runner->>UI: Update working state
    UI->>User: Show "Thinking..." animation

    Agent->>EventEmitter: Emit 'tool_start' event
    EventEmitter->>Runner: handleEvent(tool_start)
    Runner->>UI: Set activeToolName
    UI->>User: Show "Executing tool X..."

    loop Tool Progress (if available)
        Agent->>EventEmitter: Emit 'tool_progress' event
        EventEmitter->>Runner: handleEvent(tool_progress)
        Runner->>UI: Update progress message
        UI->>User: Show progress: "Fetching data..."
    end

    Agent->>EventEmitter: Emit 'tool_end' event
    EventEmitter->>Runner: handleEvent(tool_end)
    Runner->>UI: Mark tool complete
    UI->>User: Show "✓ Tool completed"

    opt Tool Error
        Agent->>EventEmitter: Emit 'tool_error' event
        EventEmitter->>Runner: handleEvent(tool_error)
        Runner->>UI: Show error in event list
        UI->>User: Show "✗ Tool failed: error"
    end

    opt Context Threshold Exceeded
        Agent->>EventEmitter: Emit 'context_cleared' event
        EventEmitter->>Runner: handleEvent(context_cleared)
        Runner->>UI: Show context management
        UI->>User: Show "Cleared old results"
    end

    opt Tool Limit Warning
        Agent->>EventEmitter: Emit 'tool_limit' event
        EventEmitter->>Runner: handleEvent(tool_limit)
        Runner->>UI: Show warning
        UI->>User: Show "Tool limit approaching"
    end

    Agent->>EventEmitter: Emit 'answer_start' event
    EventEmitter->>Runner: handleEvent(answer_start)
    Runner->>UI: Prepare for answer
    UI->>User: Show "Generating answer..."

    Agent->>EventEmitter: Emit 'done' event + metrics
    EventEmitter->>Runner: handleEvent(done)
    Runner->>UI: Display answer + metrics
    UI->>User: Show formatted answer

    opt Long-running query
        UI->>User: Show performance stats<br/>(tokens/sec, duration)
    end

    Note over Agent,User: User can press Esc to abort anytime
```

### Event Types

```typescript
type AgentEvent =
  | ThinkingEvent         // LLM reasoning text
  | ToolStartEvent        // Tool execution initiated
  | ToolProgressEvent     // Real-time progress from tool
  | ToolEndEvent          // Tool completed successfully
  | ToolErrorEvent        // Tool failed with error
  | ToolLimitEvent        // Tool call limit warning
  | ContextClearedEvent   // Old context removed
  | AnswerStartEvent      // Final answer generation started
  | DoneEvent             // Complete with answer & metrics
```

---

## Keyboard Shortcuts & Commands

| Input | Action |
|-------|--------|
| `exit`, `quit` | Exit application |
| `/model` | Start model selection flow |
| `Esc` | Cancel current action/execution |
| `Ctrl+C` | Cancel or exit |
| `↑` / `↓` | Navigate input history |
| `Shift+Enter` | Multi-line input |
| `Ctrl+A` | Move to start of line |
| `Ctrl+E` | Move to end of line |
| `Alt+←` / `Alt+→` | Word navigation |

---

## Performance Optimizations

### 1. **Anthropic Prompt Caching**
- System prompt marked with `cache_control: { type: 'ephemeral' }`
- 90% cost reduction on subsequent calls
- Implemented in `buildAnthropicMessages()`

### 2. **Azure Token Caching**
- Tokens cached for 5 minutes
- Reduces auth overhead
- Automatic refresh before expiry

### 3. **Context Management**
- Threshold: 100k tokens
- Keeps last 5 tool results
- Clears oldest results when exceeded
- Full context for final answer

### 4. **Tool Result Summarization**
- LLM summarizes large tool outputs
- Reduces context size
- Preserves key information

### 5. **InMemoryChatHistory Relevance**
- Caches relevance scores
- Only selects relevant past messages
- Reduces prompt size for multi-turn

---

## Error Handling & Safety

### 1. **Graceful Cancellation**
```typescript
AbortController → agent.run(signal)
                → tool.invoke(signal)
                → Mark as 'interrupted'
```

### 2. **Retry Logic**
- Exponential backoff
- Max 3 attempts per LLM call
- Logs each failure attempt

### 3. **Soft Limits**
- Tool call warnings (not blocks)
- Query similarity detection
- Informs LLM via prompt

### 4. **Error Display**
- Tool errors shown in event list
- Agent continues execution
- Final error state if critical

---

## Architecture Highlights

### ✅ **Strengths**

1. **Real-time Event Streaming** - Async generator pattern for instant UI updates
2. **Modular Hook Design** - Separation of concerns (model, agent, history)
3. **Multi-provider Support** - Easy to add new LLM providers
4. **Graceful Degradation** - Continues on tool errors, soft limits
5. **Context Management** - Intelligent clearing for long conversations
6. **Comprehensive Persistence** - Settings, history, scratchpad all saved
7. **Developer Experience** - Ink/React for terminal UI, TypeScript
8. **Cancellation Support** - User can abort at any time
9. **Progress Feedback** - Real-time tool progress via ProgressChannel
10. **Flexible Tool System** - Easy to add new tools

### 🔄 **Key Patterns**

- **React Hooks** for state management
- **Async Generators** for event streaming
- **AbortController** for cancellation
- **Ink Components** for terminal rendering
- **JSONL Logs** for debugging
- **TokenManager** for credential management
- **ProgressChannel** for real-time updates

---

## File Structure Summary

```
src/
├── index.tsx                    # Entry point (Bun runtime)
├── cli.tsx                      # Main CLI component (React/Ink)
│
├── agent/
│   ├── agent.ts                 # Agent class with execution loop
│   ├── prompts.ts               # System prompts
│   ├── scratchpad.ts            # JSONL logging & context management
│   ├── token-counter.ts         # Token usage tracking
│   └── types.ts                 # Agent event types
│
├── model/
│   ├── llm.ts                   # LLM integration (getChatModel, callLlm)
│   ├── token-manager.ts         # Keychain + env credential management
│   └── azure-openai-models.ts   # Azure constants
│
├── tools/
│   ├── registry.ts              # Tool registration (getTools)
│   ├── web-search.ts            # Search tools (Exa/Perplexity/Tavily)
│   ├── web-fetch.ts             # URL fetching
│   ├── browser.ts               # Playwright automation
│   ├── financial-search.ts      # Financial data
│   └── skill.ts                 # Skill execution
│
├── ui/
│   ├── model-selector.tsx       # Provider/model selection
│   ├── history-item-view.tsx    # Query/answer display
│   ├── answer-box.tsx           # Formatted answer
│   ├── agent-event-view.tsx     # Tool/thinking events
│   ├── working-indicator.tsx    # Processing animation
│   └── input.tsx                # Text input with history
│
├── hooks/
│   ├── use-model-selection.ts   # Model selection state
│   ├── use-agent-runner.ts      # Agent execution state
│   └── use-input-history.ts     # History navigation
│
├── utils/
│   ├── in-memory-chat-history.ts      # Conversation context
│   ├── long-term-chat-history.ts      # Persistent history
│   ├── progress-channel.ts            # Real-time progress
│   ├── settings.ts                    # Settings persistence
│   └── logger.ts                      # Logging
│
└── providers.ts                 # Provider registry

.dexter/
├── settings.json                # Provider & model config
├── scratchpad/
│   └── timestamp_hash.jsonl     # Per-query logs
└── messages/
    └── chat_history.json        # All conversations
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Bun |
| **Language** | TypeScript |
| **UI Framework** | React + Ink (terminal rendering) |
| **LLM Integration** | LangChain |
| **State Management** | React Hooks + Refs |
| **Storage** | JSON/JSONL files |
| **Authentication** | Azure Identity, TokenManager |
| **Web Automation** | Playwright |
| **Async Patterns** | Async generators, EventEmitter |

---

## Extending the Architecture

### Adding a New Tool

1. Create tool in `src/tools/`
2. Register in `src/tools/registry.ts`
3. Optionally implement ProgressChannel for real-time updates

### Adding a New LLM Provider

1. Add factory to `MODEL_FACTORIES` in `src/model/llm.ts`
2. Register provider in `src/providers.ts`
3. Update UI options in `PROVIDERS` array

### Adding New UI Component

1. Create component in `src/ui/`
2. Integrate in `src/cli.tsx`
3. Use Ink's Box/Text components for layout

---

**Last Updated:** 2026-02-14
**Architecture Version:** 2026.2.14
