# Dexter System - Quick Reference Card

Fast lookup for common commands, ports, and configurations.

## 🚀 Quick Start Commands

```bash
# Start everything
npm run dev                          # Gateway + CLI

# Individual components  
npm run dev:cli                      # CLI only
npm run dev:server                   # Gateway only
npm run web                          # Gateway + Web client
npm run web:client                   # Web client only

# VS Code Extension
cd dexter-vscode && code .           # Open in VS Code
# Press F5 to launch
```

## 🌐 Ports & URLs

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| HTTP Gateway | 3000 | http://localhost:3000 | Agent API + SSE |
| Web Client | 5173 | http://localhost:5173 | React web interface |

## 📡 API Quick Test

```bash
# Health check
curl http://localhost:3000/api/health

# Start chat
curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"query":"Hello"}'
```

## ⚙️ VS Code Settings

```json
{
  "dexter.agentMode": "gateway",
  "dexter.gatewayUrl": "http://localhost:3000"
}
```

## 📚 Documentation

- [SYSTEM_DESIGN_GUIDE.md](SYSTEM_DESIGN_GUIDE.md) - Complete architecture
- [HTTP_GATEWAY_GUIDE.md](HTTP_GATEWAY_GUIDE.md) - Gateway guide
- [dexter-vscode/](dexter-vscode/) - VS Code extension docs

**Quick Reference v1.0.0**
