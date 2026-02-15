# Debugging Chat Message Not Passed to Agent

## Problem Summary

The issue is that chat messages are not being passed to the agent. The logs show:
- ✅ SSE connection is established (GET `/api/chat/:sessionId/stream`)
- ❌ But the POST request to create the chat session is missing
- ❌ No message is dispatched to the agent
- ❌ Body parser shows "skip empty body" (expected for GET, but POST should have happened first)

## Root Cause Analysis

The expected flow:
1. User sends message → Frontend calls `startChat()` → **POST /api/chat** with message body
2. Backend creates session → Returns sessionId
3. Frontend opens SSE connection → **GET /api/chat/:sessionId/stream**
4. Backend processes message → Streams events back

**Current problem**: Step 1 (POST) is not happening or failing silently.

## What I've Done

I've added comprehensive debugging logs throughout the entire message flow:

### Frontend Changes
1. **[ChatContainer.tsx](src/web/client/src/components/ChatContainer.tsx)** - Logs when user submits message
2. **[useAgentStream.ts](src/web/client/src/hooks/useAgentStream.ts)** - Logs the entire sendMessage flow
3. **[api.ts](src/web/client/src/services/api.ts)** - Logs HTTP requests and responses
4. **[useSSE.ts](src/web/client/src/hooks/useSSE.ts)** - Logs SSE connection lifecycle

### Log Markers
Look for these log markers in the browser console:
- `[ChatContainer]` - User interaction layer
- `[useAgentStream]` - Message state management
- `[API]` - HTTP requests/responses
- `[useSSE]` - EventSource connection

## How to Test

### 1. Start the backend (if not running)
```bash
cd /Users/ghu/aiworker/dexter
npm run http-gateway
```

### 2. Start the frontend dev server
```bash
cd /Users/ghu/aiworker/dexter/src/web/client
npm run dev
```

### 3. Open browser
- Navigate to http://localhost:5173
- **Open the browser DevTools Console (F12 → Console tab)**

### 4. Send a test message
- Type any message in the input box
- Click "Send" or press Enter
- **Watch the console logs**

## What to Look For

### ✅ Success Flow (Expected logs in order):
```
[ChatContainer] ═══════════════════════════════════════
[ChatContainer] handleSend called
[ChatContainer]    Query: your message

[useAgentStream] ═══════════════════════════════════════
[useAgentStream] 📤 sendMessage called
[useAgentStream]    Query: your message

[API] ═══════════════════════════════════════
[API] 📤 POST /api/chat
[API]    URL: http://localhost:3000/api/chat
[API]    Request body: { "query": "your message", "userId": "anonymous" }

[API] 📥 Response received
[API]    Status: 200 OK
[API] ✅ Success: { "sessionId": "...", "streamUrl": "..." }

[useAgentStream] ✅ startChat response received
[useAgentStream]    Session ID: http-...

[useSSE] ═══════════════════════════════════════
[useSSE] 🔌 Creating EventSource connection...
[useSSE] ✅ Connection opened successfully
[useSSE] 📨 Received event: thinking
[useSSE] 📨 Received event: done
```

### ❌ Failure Scenarios:

#### Scenario 1: POST never happens
```
[ChatContainer] handleSend called
[useAgentStream] sendMessage called
[useAgentStream] ⚠️  Skipping... (some condition)
```
→ **Cause**: State issue (isProcessing already true, or query is empty)

#### Scenario 2: POST fails
```
[API] 📤 POST /api/chat
[API] ❌❌❌ Exception in startChat: ...
[useAgentStream] ❌❌❌ Failed to start chat
```
→ **Cause**: Network error, CORS issue, or backend not running

#### Scenario 3: SSE connects without POST
```
[useSSE] 🔌 Creating EventSource connection...
(No [API] POST logs before this)
```
→ **Cause**: Stale sessionId or React state issue

## Backend Logs to Check

Look for these in the backend console (npm run http-gateway):

### Expected:
```
[HTTP Server] ╔══════════════════════════════════════════╗
[HTTP Server] ║  NEW CHAT REQUEST                        ║
[HTTP Server] ╚══════════════════════════════════════════╝

[HTTP Gateway] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[HTTP Gateway] 📥 NEW MESSAGE RECEIVED
[HTTP Gateway]    Query: "your message"
```

### If missing:
- The POST request never reached the backend
- Check CORS settings
- Check if ports match (frontend should call http://localhost:3000)

## Next Steps

After testing, share:
1. **Full browser console output** (copy all logs)
2. **Backend console output** (the logs from npm run http-gateway)
3. **Network tab** from DevTools showing the requests

This will help identify exactly where the message flow breaks.

## Quick Fixes to Try

### Fix 1: Clear browser cache and reload
```bash
# In browser: Ctrl+Shift+R (hard reload)
```

### Fix 2: Check environment variables
```bash
# In src/web/client/.env or .env.local
VITE_API_BASE=http://localhost:3000/api
```

### Fix 3: Verify CORS settings
Backend should allow `http://localhost:5173`:
```typescript
// In http-gateway.ts
corsOrigins: ['http://localhost:5173']
```

### Fix 4: Check if backend is accessible
```bash
curl http://localhost:3000/api/health
# Should return: {"status":"ok","timestamp":...}
```

## Files Modified

- ✅ `src/web/client/src/components/ChatContainer.tsx`
- ✅ `src/web/client/src/hooks/useAgentStream.ts`
- ✅ `src/web/client/src/services/api.ts`
- ✅ `src/web/client/src/hooks/useSSE.ts`
- ✅ `src/web/client/vite.config.ts` (build fix)
- ✅ `src/web/client/src/setupTests.ts` (build fix)
- ✅ `src/web/client/tsconfig.node.json` (build fix)
