# Quick Reference: LLM Provider Configuration

## 🎯 Current Configuration

**Default Provider:** Claude/Anthropic
**Default Model:** `claude-sonnet-4-5-20250929`
**Authentication:** TokenManager (Keychain + Environment)

## 🔄 Switch Providers in 2 Steps

### → Claude (Current)
```typescript
// src/model/llm.ts:26-27
export const DEFAULT_PROVIDER = 'anthropic';
export const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
```

### → Azure OpenAI
```typescript
// src/model/llm.ts:26-27
export const DEFAULT_PROVIDER = 'azureopenai';
export const DEFAULT_MODEL = 'gpt-5.2';
```

### → Other Providers
```typescript
// src/model/llm.ts:26-27
export const DEFAULT_PROVIDER = 'openai';      // OpenAI
export const DEFAULT_MODEL = 'gpt-4o';

export const DEFAULT_PROVIDER = 'google';      // Google
export const DEFAULT_MODEL = 'gemini-pro';

export const DEFAULT_PROVIDER = 'ollama';      // Ollama (local)
export const DEFAULT_MODEL = 'llama3.2';
```

## 🔑 Authentication Quick Setup

### Claude/Anthropic
```bash
# Option 1: No setup needed (uses keychain automatically)
# Just install Claude Code and log in

# Option 2: Set API key manually
echo 'ANTHROPIC_API_KEY=sk-ant-your-key' >> .env
```

### Azure OpenAI
```bash
# Development (local)
az login

# Production (automatic)
NODE_ENV=production
```

### Other Providers
```bash
# Add to .env file
OPENAI_API_KEY=your-key
GOOGLE_API_KEY=your-key
XAI_API_KEY=your-key
OPENROUTER_API_KEY=your-key
```

## 📝 Available Models

### Claude/Anthropic
- `claude-opus-4-6` - Most capable, expensive
- `claude-sonnet-4-5-20250929` - Balanced ⭐ **Recommended**
- `claude-haiku-4-5-20251001` - Fast, cost-effective

### Azure OpenAI
- `gpt-5.2` - Latest ⭐ **Recommended**
- `gpt-4o` - GPT-4 Optimized
- `gpt-4-turbo` - GPT-4 Turbo

### OpenAI
- `gpt-4o` - Latest ⭐ **Recommended**
- `gpt-4-turbo` - Fast
- `gpt-3.5-turbo` - Cost-effective

### Google
- `gemini-2.0-flash-exp` - Latest ⭐ **Recommended**
- `gemini-pro` - Balanced

### Ollama (Local)
- `llama3.2` - Meta's latest
- `qwen2.5` - Alibaba's model
- `deepseek-r1` - Reasoning model

## 🧪 Testing

```bash
# Test Claude integration
bun run test-claude.ts

# Test the full agent
bun run start

# Type check
bun run typecheck
```

## 📚 Documentation

- **Full Guide:** [SWITCHING_LLM_PROVIDERS.md](SWITCHING_LLM_PROVIDERS.md)
- **Main README:** [README.md](README.md)
- **Token Manager:** [src/model/token-manager.ts](src/model/token-manager.ts)
- **LLM Configuration:** [src/model/llm.ts](src/model/llm.ts)

## 💡 Pro Tips

1. **Claude + Keychain** - Best for development on macOS
2. **Azure OpenAI** - Best for production deployments
3. **Ollama** - Best for local development without API costs
4. **Check logs** - Look for `[TokenManager]` and `[LLM]` logs for credential status

---

**Need help?** See [SWITCHING_LLM_PROVIDERS.md](SWITCHING_LLM_PROVIDERS.md) for detailed instructions.
