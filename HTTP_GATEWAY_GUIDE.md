# Dexter HTTP Gateway - Quick Start Guide

Complete guide to run the Dexter HTTP gateway for web-based chat interface.

## 🎯 What is the HTTP Gateway?

The HTTP gateway provides a REST API and Server-Sent Events (SSE) for web clients to interact with the Dexter AI agent.

**Features:**
- ✅ REST API for starting chat sessions
- ✅ Server-Sent Events (SSE) for streaming responses
- ✅ CORS support for web clients
- ✅ Session management
- ✅ Multi-user support

---

## 🚀 Quick Start (3 Methods)

### Method 1: Using npm Script (Recommended)

```bash
# Navigate to project root
cd /Users/ghu/aiworker/dexter

# Run HTTP gateway
npm run web:server
```

### Method 2: Using bun directly

```bash
cd /Users/ghu/aiworker/dexter
bun run src/gateway/http-gateway.ts
```

### Method 3: Full Web Interface (Gateway + Client)

```bash
# Run both server and client together
npm run web:dev
```

This starts:
- HTTP gateway on `http://localhost:3000`
- Web client on `http://localhost:5173`

---

## ⚙️ Configuration

### Default Configuration

The gateway uses these defaults (can be overridden via environment variables):

```bash
# Server
HTTP_CHANNEL_PORT=3000
HTTP_CHANNEL_HOST=localhost

# CORS (allowed origins)
HTTP_CHANNEL_CORS_ORIGINS=http://localhost:5173

# Logging
LOG_LEVEL=info
```

### Custom Configuration

Create or update `.env` file:

```bash
# In /Users/ghu/aiworker/dexter/.env

# Gateway Configuration
HTTP_CHANNEL_PORT=3000
HTTP_CHANNEL_HOST=0.0.0.0  # Listen on all interfaces

# Allow multiple origins
HTTP_CHANNEL_CORS_ORIGINS=http://localhost:5173,http://localhost:3001

# AI Model Configuration
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
TAVILY_API_KEY=tvly-...
EXA_API_KEY=...

# Default Model
DEFAULT_MODEL=gpt-5.2
DEFAULT_PROVIDER=openai
```

---

## 📝 Step-by-Step Instructions

### Step 1: Verify Prerequisites

```bash
# Check Node.js/Bun
bun --version
# or
node --version

# Verify you're in the correct directory
pwd
# Should show: /Users/ghu/aiworker/dexter

# Check .env file exists with API keys
cat .env | grep API_KEY
```

### Step 2: Start the Gateway

**Terminal 1 - Start Gateway:**
```bash
npm run web:server
```

**Expected output:**
```
[HTTP Gateway] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[HTTP Gateway] 🚀 HTTP Server started
[HTTP Gateway]    Host: localhost
[HTTP Gateway]    Port: 3000
[HTTP Gateway]    URL:  http://localhost:3000
[HTTP Gateway] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[HTTP Gateway] 📡 Listening for requests...
```

### Step 3: Start the Web Client (Optional)

**Terminal 2 - Start Web Client:**
```bash
cd src/web/client
npm run dev
```

**Expected output:**
```
  VITE v7.3.1  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Step 4: Test the Gateway

**Open browser:**
```
http://localhost:5173
```

**Or test with curl:**
```bash
# Health check
curl http://localhost:3000/api/health

# Expected response:
# {"status":"ok","timestamp":1708000000,"uptime":123}
```

---

## 🧪 Testing the Gateway

### Test 1: Health Check

```bash
curl http://localhost:3000/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": 1708000000000,
  "uptime": 123.456
}
```

### Test 2: Start Chat Session

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is 2+2?",
    "userId": "test-user"
  }'
```

**Expected response:**
```json
{
  "sessionId": "session-1708000000000-abc123",
  "streamUrl": "/api/chat/session-1708000000000-abc123/stream"
}
```

### Test 3: Stream Events

```bash
# Using the sessionId from previous response
curl -N http://localhost:3000/api/chat/SESSION_ID/stream
```

**Expected output (SSE format):**
```
event: connected
data: {"type":"connected"}

event: thinking
data: {"type":"thinking","message":"Calculating 2+2..."}

event: done
data: {"type":"done","answer":"2+2 equals 4","iterations":1,"totalTime":1234}
```

---

## 📡 API Endpoints

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1708000000000,
  "uptime": 123.456
}
```

### POST /api/chat

Start a new chat session.

**Request:**
```json
{
  "query": "What is the weather?",
  "userId": "user123",          // Optional, defaults to "anonymous"
  "model": "gpt-5.2",           // Optional, defaults to DEFAULT_MODEL
  "modelProvider": "openai"     // Optional, defaults to DEFAULT_PROVIDER
}
```

**Response:**
```json
{
  "sessionId": "session-1708000000-abc",
  "streamUrl": "/api/chat/session-1708000000-abc/stream"
}
```

### GET /api/chat/:sessionId/stream

Stream agent events via Server-Sent Events (SSE).

**Events:**
- `connected` - Connection established
- `thinking` - Agent is thinking
- `tool_start` - Tool execution started
- `tool_end` - Tool execution completed
- `tool_error` - Tool execution failed
- `done` - Agent completed, final answer ready

**Example event:**
```
event: thinking
data: {"type":"thinking","message":"Searching for information..."}
```

### POST /api/chat/:sessionId/cancel

Cancel a running chat session.

**Response:**
```json
{
  "message": "Session cancelled",
  "sessionId": "session-1708000000-abc"
}
```

---

## 🔧 Troubleshooting

### Issue: Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**

1. **Kill process using port 3000:**
   ```bash
   # Find process
   lsof -i :3000

   # Kill it
   kill -9 PID
   ```

2. **Use different port:**
   ```bash
   # Set in .env
   HTTP_CHANNEL_PORT=3001

   # Or inline
   HTTP_CHANNEL_PORT=3001 npm run web:server
   ```

### Issue: CORS Errors

**Error in browser console:**
```
Access to fetch at 'http://localhost:3000/api/chat' from origin
'http://localhost:5174' has been blocked by CORS policy
```

**Solution:**

Add your client URL to CORS origins in `.env`:
```bash
HTTP_CHANNEL_CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

Restart the gateway.

### Issue: API Key Errors

**Error in gateway logs:**
```
Error: API key not configured
```

**Solution:**

Check `.env` file has required keys:
```bash
cat .env | grep API_KEY

# Should show:
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
TAVILY_API_KEY=tvly-...
EXA_API_KEY=...
```

If missing, add them to `.env` and restart gateway.

### Issue: Gateway Won't Start

**Check for errors:**
```bash
# Run with verbose logging
LOG_LEVEL=debug npm run web:server
```

**Common causes:**
- Missing dependencies: `npm install`
- TypeScript errors: `npm run typecheck`
- Port conflicts: Use different port
- Environment variables: Check `.env`

---

## 🌐 Full Web Interface Setup

To run the complete web interface (gateway + client):

### Step 1: Install Client Dependencies

```bash
cd /Users/ghu/aiworker/dexter/src/web/client
npm install
```

### Step 2: Start Both (Concurrent)

```bash
# From project root
npm run web:dev
```

This starts:
- **Gateway:** `http://localhost:3000`
- **Client:** `http://localhost:5173`

### Step 3: Open Browser

Navigate to: `http://localhost:5173`

You should see the Dexter AI chat interface.

---

## 🔍 Monitoring & Logs

### Gateway Logs

The gateway outputs detailed logs:

```
[HTTP Gateway] 📥 NEW MESSAGE RECEIVED
[HTTP Gateway]    Session ID: session-1708000000-abc
[HTTP Gateway]    User ID:    test-user
[HTTP Gateway]    Query:      "What is 2+2?"
[HTTP Gateway] 🤖 Starting agent with model: gpt-5.2 (openai)
[HTTP Gateway] ⚙️  Running agent...
[HTTP Gateway] 📨 Sent event: thinking
[HTTP Gateway] 📨 Sent event: done
[HTTP Gateway] ✅ Agent completed successfully
```

### Enable Debug Logs

```bash
LOG_LEVEL=debug npm run web:server
```

### Disable Logs

```bash
LOG_LEVEL=error npm run web:server
```

---

## 🚀 Production Deployment

### Using PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start gateway
pm2 start npm --name "dexter-gateway" -- run web:server

# Check status
pm2 status

# View logs
pm2 logs dexter-gateway

# Stop
pm2 stop dexter-gateway

# Restart
pm2 restart dexter-gateway
```

### Using Docker (Future)

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "web:server"]
```

Build and run:
```bash
docker build -t dexter-gateway .
docker run -p 3000:3000 --env-file .env dexter-gateway
```

### Environment Variables for Production

```bash
# Production .env
HTTP_CHANNEL_PORT=3000
HTTP_CHANNEL_HOST=0.0.0.0
HTTP_CHANNEL_CORS_ORIGINS=https://yourapp.com

# Secure with API key (when implemented)
HTTP_CHANNEL_AUTH_TYPE=bearer
HTTP_CHANNEL_AUTH_TOKEN=your-secret-token

# Production model
DEFAULT_MODEL=gpt-5.2
DEFAULT_PROVIDER=openai

# API Keys (use secrets manager in production!)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 📊 Architecture Overview

```
┌─────────────────┐
│  Web Browser    │
│  (localhost:    │
│   5173)         │
└────────┬────────┘
         │ HTTP/SSE
         ▼
┌─────────────────────────┐
│  HTTP Gateway           │
│  (localhost:3000)       │
│                         │
│  ┌──────────────────┐   │
│  │ Express Server   │   │
│  │ - REST API       │   │
│  │ - SSE Streaming  │   │
│  └────────┬─────────┘   │
│           │             │
│           ▼             │
│  ┌──────────────────┐   │
│  │ Agent Runner     │   │
│  │ - Session Mgmt   │   │
│  │ - Agent.run()    │   │
│  └────────┬─────────┘   │
└───────────┼─────────────┘
            │
            ▼
    ┌───────────────┐
    │  Agent        │
    │  - LLM calls  │
    │  - Tools      │
    │  - Streaming  │
    └───────────────┘
```

---

## 🎯 Quick Command Reference

```bash
# Start gateway only
npm run web:server

# Start gateway + client
npm run web:dev

# Start with custom port
HTTP_CHANNEL_PORT=3001 npm run web:server

# Start with debug logs
LOG_LEVEL=debug npm run web:server

# Health check
curl http://localhost:3000/api/health

# Test chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query":"Hello"}'
```

---

## ✅ Success Checklist

Before considering the gateway fully operational:

- [ ] Gateway starts without errors
- [ ] Health endpoint responds: `/api/health`
- [ ] Can create chat session: `POST /api/chat`
- [ ] SSE stream works: `GET /api/chat/:id/stream`
- [ ] Agent responds to queries
- [ ] Events stream in real-time
- [ ] Cancel works: `POST /api/chat/:id/cancel`
- [ ] Web client can connect (if using)
- [ ] CORS configured correctly
- [ ] API keys loaded from `.env`

---

**Your HTTP Gateway is ready to serve Dexter AI requests! 🚀**

For the complete web interface with React client, run:
```bash
npm run web:dev
```

Then open `http://localhost:5173` in your browser.
