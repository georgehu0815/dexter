# Dexter System Architecture - Diagrams Quick Reference

## Available Diagrams

### 1. Complete System Architecture
**File:** [dexter_architecture.png](dexter_architecture.png)
**Size:** 3.0 MB (high resolution)
**Best for:** Understanding all components and their relationships

**Shows:**
- ✅ All 7 layers (Client, Gateway, Agent Core, LLM, Tools, Storage, External)
- ✅ All components within each layer
- ✅ Data flow between components
- ✅ External service integrations
- ✅ Storage and credential management

**Use when:** You need to see the complete picture or explain the entire system to stakeholders.

---

### 2. Simplified Data Flow
**File:** [dexter_dataflow.png](dexter_dataflow.png)
**Size:** 945 KB
**Best for:** Understanding how messages flow through the system

**Shows:**
- ✅ 6-step message flow (User → Gateway → Agent → LLM/Tools → Response)
- ✅ Three user interfaces (CLI, Web, WhatsApp)
- ✅ Gateway routing logic
- ✅ Event streaming back to clients
- ✅ Credential and storage interactions

**Use when:** You need to explain how a user message gets processed or troubleshoot the message flow.

---

### 3. Component Architecture
**File:** [dexter_components.png](dexter_components.png)
**Size:** 978 KB
**Best for:** Understanding the detailed component breakdown

**Shows:**
- ✅ 5 layers with internal components
- ✅ Component relationships within each layer
- ✅ Technology stack per component (React, TypeScript, Node.js, etc.)
- ✅ Key functions and classes
- ✅ Inter-layer communication

**Use when:** You're implementing a feature or debugging a specific component.

---

## Quick Navigation

| I want to... | Use this diagram |
|--------------|------------------|
| Explain the system to a new team member | [Complete System Architecture](#1-complete-system-architecture) |
| Understand how my message becomes a response | [Simplified Data Flow](#2-simplified-data-flow) |
| Find where a specific component lives | [Component Architecture](#3-component-architecture) |
| See all available tools and skills | [Complete System Architecture](#1-complete-system-architecture) → Tools & Skills Layer |
| Understand how SSE works | [Simplified Data Flow](#2-simplified-data-flow) → Step 6 (Event Streaming) |
| See how WhatsApp messages are handled | [Simplified Data Flow](#2-simplified-data-flow) → WhatsApp path |
| Find where credentials are stored | [Complete System Architecture](#1-complete-system-architecture) → LLM Integration Layer |
| Debug agent execution | [Component Architecture](#3-component-architecture) → Layer 3 (Agent Core) |

---

## Color Coding

All diagrams use consistent color coding:

| Color | Layer/Concept |
|-------|---------------|
| **Blue** | User Interfaces / Client Layer |
| **Purple** | Gateways / Routing Layer |
| **Green** | Agent Core / Execution Layer |
| **Orange** | LLM Integration / AI Services |
| **Pink** | Tools & Skills / Capabilities |
| **Teal** | Storage & Persistence |
| **Red** | External Services / APIs |

---

## Key Components at a Glance

### User Interfaces (3)
1. **CLI Terminal** - Bun runtime, React Ink UI, direct access
2. **Web Browser** - React SPA, port 5173, SSE streaming
3. **WhatsApp Client** - Mobile app, Baileys library

### Gateways (2)
1. **HTTP Gateway** - Express server, port 3000, REST + SSE
2. **WhatsApp Gateway** - Baileys, multi-device support, QR auth

### Agent Core (3)
1. **Agent Runner** - Session management, message queue
2. **Agent Loop** - Max 10 iterations, tool orchestration
3. **Context Management** - InMemoryChatHistory, 100k token threshold

### LLM Integration (2)
1. **Token Manager** - Keychain, .env, Azure Managed Identity
2. **LLM Service** - 9 providers: Azure OpenAI, Claude, OpenAI, Gemini, Ollama, etc.

### Tools & Skills (3)
1. **Tool Registry** - Dynamic loading based on API keys
2. **Built-in Tools** - web_search, web_fetch, browser, financial_*
3. **Skills System** - DCF valuation, custom workflows

### Storage (4)
1. `.dexter/settings.json` - Provider config
2. `.dexter/messages/chat_history.json` - Persistent history
3. `.dexter/scratchpad/*.jsonl` - Execution logs
4. `.env` + macOS Keychain - API keys

---

## Event Types

The agent emits these events during execution:

| Event | Description | When |
|-------|-------------|------|
| `thinking` | LLM reasoning | During LLM processing |
| `tool_start` | Tool execution begins | Before calling a tool |
| `tool_progress` | Real-time progress | During tool execution |
| `tool_end` | Tool completed | After successful tool call |
| `tool_error` | Tool failed | On tool error |
| `answer_start` | Final answer generation | Before final LLM call |
| `done` | Complete with answer | End of agent run |

All events are streamed to clients in real-time via:
- **CLI**: Direct EventEmitter
- **Web**: Server-Sent Events (SSE)
- **WhatsApp**: Text messages

---

## Data Flow Summary

```
┌─────────────┐
│ User Input  │
│ (CLI/Web/WA)│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Gateway    │ ← Routing & session creation
│ (HTTP/WA)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Agent Runner│ ← Session management
│   + Agent   │
└──────┬──────┘
       │
       ├─────────────┐
       ▼             ▼
┌─────────────┐  ┌─────────────┐
│ LLM Service │  │Tool Executor│
│  + Context  │  │  + Skills   │
└──────┬──────┘  └──────┬──────┘
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│External LLMs│  │External APIs│
│(Azure/Claude│  │ (Search/    │
│ /OpenAI)    │  │  Finance)   │
└──────┬──────┘  └──────┬──────┘
       │                │
       └────────┬───────┘
                ▼
       ┌─────────────────┐
       │ Events Streamed │
       │  Back to User   │
       └─────────────────┘
```

---

## Technology Stack Summary

| Component | Technology |
|-----------|------------|
| **CLI Runtime** | Bun |
| **CLI UI** | React + Ink |
| **Web Frontend** | React + TypeScript |
| **Web Server** | Express.js |
| **Real-time** | Server-Sent Events (SSE) |
| **WhatsApp** | Baileys (WhatsApp Web Protocol) |
| **Agent** | LangChain + TypeScript |
| **Storage** | JSON/JSONL files |
| **Credentials** | macOS Keychain, Azure Identity |
| **LLM Providers** | Azure OpenAI, Anthropic, OpenAI, Google, Ollama |
| **Web Automation** | Playwright |

---

## Related Documentation

- **[SYSTEM_ARCHITECTURE_DIAGRAMS.md](SYSTEM_ARCHITECTURE_DIAGRAMS.md)** - Detailed explanation of all diagrams
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Original CLI architecture documentation
- **[src/web/ARCHITECTURE.md](src/web/ARCHITECTURE.md)** - Web interface architecture
- **[GATEWAY_UNIFICATION_PLAN.md](src/web/GATEWAY_UNIFICATION_PLAN.md)** - Gateway architecture plan

---

## Viewing the Diagrams

### In IDE (VS Code)
- Open the PNG files directly in the editor
- Use image preview extension for better viewing

### In Terminal
```bash
open dexter_architecture.png     # macOS
xdg-open dexter_architecture.png # Linux
start dexter_architecture.png    # Windows
```

### In Browser
```bash
open -a "Google Chrome" dexter_architecture.png
```

---

**Generated:** 2026-02-14
**Version:** 1.0.0
