# Dexter Scripts

Helper scripts for running and managing Dexter components.

## Web Interface Scripts

### Quick Start (Standard Logging)

Run both the HTTP gateway and React web app with standard logging:

```bash
npm run web
```

This will:
- Start the HTTP Gateway on port 3000
- Start the React web app on port 5173
- Display logs from both servers with color-coded prefixes
- Gracefully shut down both servers when you press Ctrl+C

### Verbose Mode (All Logs with Timestamps)

Run both servers with verbose logging including timestamps:

```bash
npm run web:verbose
```

Features:
- Timestamps on every log line (HH:MM:SS.mmm format)
- Color-coded output by component
- Debug information enabled
- Startup status indicators
- Health check URLs displayed

### Restart (Clean Slate)

Kill any existing processes and restart with verbose logging:

```bash
npm run web:restart
```

This script will:
- Kill any processes on port 3000 (HTTP gateway)
- Kill any processes on ports 5173 and 5174 (React app)
- Wait for ports to be freed (force kill if needed)
- Start fresh with verbose logging

**Use this when:**
- Changing environment variables (like CORS settings)
- Recovering from crashed processes
- Ports are stuck in use
- You want a guaranteed clean restart

### Individual Components

Run components separately:

```bash
# Backend only
npm run web:server

# Frontend only
npm run web:client
```

## Direct Script Usage

You can also run the scripts directly:

```bash
# Standard mode
./scripts/run-web-interface.sh

# Verbose mode
./scripts/run-web-interface-verbose.sh

# Restart (kills existing processes first)
./scripts/restart-web-interface.sh
```

## Output Format

### Standard Mode (`npm run web`)
```
[Backend]  [HTTP Gateway] Starting...
[Backend]  [HTTP Channel] Server listening on http://localhost:3000
[Frontend] VITE v5.0.0  ready in 234 ms
[Frontend] ➜  Local:   http://localhost:5173/
```

### Verbose Mode (`npm run web:verbose`)
```
[22:35:10.123] [Backend]  [HTTP Gateway] Starting...
[22:35:10.456] [Backend]  [HTTP Channel] Server listening on http://localhost:3000
[22:35:12.789] [Frontend] VITE v5.0.0  ready in 234 ms
[22:35:13.012] [Frontend] ➜  Local:   http://localhost:5173/
```

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors, use the restart script:

```bash
# Easiest solution - automatically kills and restarts
npm run web:restart
```

Or manually kill processes:

```bash
# Check what's using port 3000
lsof -ti:3000

# Kill the process
kill $(lsof -ti:3000)

# Or for port 5173
kill $(lsof -ti:5173)
```

### Backend Not Starting

Check that you have the required environment variables:
- Anthropic API key in macOS keychain OR `ANTHROPIC_API_KEY` in `.env`

### Frontend Not Starting

Ensure dependencies are installed:

```bash
cd src/web/client
npm install
```

## Environment Variables

The scripts respect these environment variables:

- `NODE_ENV` - Set to `development` by default in verbose mode
- `DEBUG` - Set to `*` in verbose mode for full debug output
- `PORT` - Override default ports (not recommended)

## Graceful Shutdown

Both scripts handle Ctrl+C gracefully:
1. Catch SIGINT/SIGTERM signals
2. Stop both frontend and backend processes
3. Clean up background jobs
4. Display shutdown confirmation

No zombie processes are left running.
