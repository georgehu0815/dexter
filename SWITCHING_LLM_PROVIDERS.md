# Guide: Switching Between Claude and Azure OpenAI

This guide explains how to switch between different LLM providers (Claude/Anthropic and Azure OpenAI) in the Dexter agent.

## Overview

The Dexter agent supports multiple LLM providers with automatic credential management:
- **Claude/Anthropic** - Uses TokenManager for keychain + environment variable support
- **Azure OpenAI** - Uses Managed Identity or Azure CLI credentials

## Quick Switch Guide

### Switch to Claude (Current Default)

**1. Update [src/model/llm.ts](src/model/llm.ts#L26-L27):**
```typescript
export const DEFAULT_PROVIDER = 'anthropic';
export const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
```

**2. Ensure credentials are available:**
- **Option A (Recommended):** Use macOS keychain - Install Claude Code and log in
- **Option B:** Set in [.env](.env) file:
  ```bash
  ANTHROPIC_API_KEY=sk-ant-your-api-key-here
  ```

**3. Test the configuration:**
```bash
bun run test-claude.ts
```

### Switch to Azure OpenAI

**1. Update [src/model/llm.ts](src/model/llm.ts#L26-L27):**
```typescript
export const DEFAULT_PROVIDER = 'azureopenai';
export const DEFAULT_MODEL = 'gpt-5.2';
```

**2. Configure Azure settings in [.env](.env):**
```bash
AZURE_OPENAI_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-5.2-chat
AZURE_OPENAI_API_VERSION=2025-01-01-preview
AZURE_OPENAI_SCOPE=https://cognitiveservices.azure.com/.default
AZURE_OPENAI_MANAGED_IDENTITY_CLIENT_ID=your-client-id
```

**3. Set up authentication:**
- **Production:** Uses Managed Identity automatically
- **Development:** Run `az login` to authenticate with Azure CLI

**4. Test the configuration:**
```bash
bun run start
```

## Detailed Configuration

### Claude/Anthropic Setup

#### Available Models
```typescript
'claude-opus-4-6'                  // Most capable, expensive
'claude-sonnet-4-5-20250929'      // Balanced (Recommended)
'claude-haiku-4-5-20251001'       // Fast, cost-effective
```

#### Credential Priority (TokenManager)
1. **Environment Variable** - `ANTHROPIC_API_KEY` in `.env`
2. **macOS Keychain** - Retrieved from Claude Code installation
3. **Error** - If neither is available

#### Configuration Files
- [src/model/llm.ts](src/model/llm.ts#L70-L80) - `getAnthropicApiKey()` function
- [src/model/token-manager.ts](src/model/token-manager.ts) - TokenManager implementation

#### Benefits
- ✅ No API key needed if Claude Code is installed
- ✅ Automatic keychain integration on macOS
- ✅ Prompt caching for 90% cost savings
- ✅ Supports both environment and keychain sources

#### Example: Use Specific API Key
```bash
# In .env file
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

### Azure OpenAI Setup

#### Available Deployments
Configure in Azure Portal and update `.env`:
```bash
AZURE_OPENAI_DEPLOYMENT=gpt-5.2-chat    # GPT-5.2
AZURE_OPENAI_DEPLOYMENT=gpt-4o          # GPT-4 Optimized
AZURE_OPENAI_DEPLOYMENT=gpt-4-turbo     # GPT-4 Turbo
```

#### Authentication Methods

**Production (Managed Identity):**
```bash
NODE_ENV=production
```
- Uses `ManagedIdentityCredential` with configured client ID
- No manual login required
- Best for deployed applications

**Development (Azure CLI):**
```bash
NODE_ENV=development  # or leave unset
```
- Uses `AzureCliCredential`
- Requires: `az login` before running
- Best for local development

#### Configuration Files
- [src/model/llm.ts](src/model/llm.ts#L103-L129) - Azure OpenAI factory
- [src/model/azure-openai-models.ts](src/model/azure-openai-models.ts) - Azure constants

#### Benefits
- ✅ No API key needed (uses Managed Identity)
- ✅ Enterprise-grade security
- ✅ Automatic token refresh
- ✅ Token caching (5-minute buffer)

#### Example: Setup for Development
```bash
# Login to Azure
az login

# Run the agent
bun run start
```

## Runtime Provider Override

You can also specify the provider at runtime without changing the default:

```typescript
import { callLlm } from './src/model/llm.js';

// Use Claude
const claudeResult = await callLlm('Your prompt', {
  model: 'claude-sonnet-4-5-20250929'
});

// Use Azure OpenAI
const azureResult = await callLlm('Your prompt', {
  model: 'gpt-5.2'
});
```

## Troubleshooting

### Claude Issues

**Error: "ANTHROPIC_API_KEY not found"**
```bash
# Solution 1: Set environment variable
echo 'ANTHROPIC_API_KEY=sk-ant-xxxxx' >> .env

# Solution 2: Install Claude Code
# Download from https://claude.ai/claude-code
# Then log in to sync credentials to keychain
```

**Error: "No credential found for service: Claude Code"**
- Make sure Claude Code is installed
- Open Claude Code and ensure you're logged in
- The TokenManager will automatically retrieve credentials

### Azure OpenAI Issues

**Error: "Failed to get Azure token"**
```bash
# For development, run:
az login

# Verify login:
az account show

# For production, check Managed Identity configuration
```

**Error: "Azure token expired"**
- Tokens are cached for 5 minutes
- The system automatically refreshes tokens
- If issues persist, check Azure Identity configuration

## Best Practices

### For Development
- **Use Claude** - Faster iteration with keychain integration
- **Use Azure CLI** - `az login` for local Azure OpenAI access
- **Keep .env uncommitted** - Don't commit API keys

### For Production
- **Use Azure OpenAI** - Better for enterprise deployments
- **Use Managed Identity** - Set `NODE_ENV=production`
- **Monitor token usage** - Check logs for usage statistics

### Cost Optimization
- **Claude with prompt caching** - 90% cost savings on repeated prompts
- **Use Haiku for simple tasks** - Much faster and cheaper
- **Use Sonnet for complex tasks** - Best balance of cost/performance
- **Use Opus only when needed** - Most capable but most expensive

## Environment Variables Reference

### Claude/Anthropic
```bash
# Optional - uses keychain if not set
ANTHROPIC_API_KEY=sk-ant-your-key
```

### Azure OpenAI
```bash
# Required for Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-5.2-chat
AZURE_OPENAI_API_VERSION=2025-01-01-preview
AZURE_OPENAI_SCOPE=https://cognitiveservices.azure.com/.default
AZURE_OPENAI_MANAGED_IDENTITY_CLIENT_ID=your-client-id

# Optional - affects credential type
NODE_ENV=production    # Uses Managed Identity
NODE_ENV=development   # Uses Azure CLI
```

### Other Providers
```bash
OPENAI_API_KEY=your-key
GOOGLE_API_KEY=your-key
XAI_API_KEY=your-key
OPENROUTER_API_KEY=your-key
MOONSHOT_API_KEY=your-key
DEEPSEEK_API_KEY=your-key
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

## Testing

### Test Claude Integration
```bash
bun run test-claude.ts
```

Expected output:
```
✅ Success! Claude responded:
📝 Response: Hello from Claude!
⏱️  Duration: 1618ms
📊 Token Usage:
   - Input tokens: 363
   - Output tokens: 7
   - Total tokens: 370
```

### Test Azure OpenAI Integration
```bash
# Make sure you're logged in
az login

# Update defaults to Azure OpenAI in llm.ts
# Then run:
bun run start
```

## Summary

| Feature | Claude/Anthropic | Azure OpenAI |
|---------|-----------------|--------------|
| **Default** | ✅ Current | ❌ Alternative |
| **Auth** | TokenManager (Keychain + Env) | Managed Identity / Azure CLI |
| **API Key Required** | ❌ Optional | ❌ No (uses credentials) |
| **macOS Keychain** | ✅ Supported | ❌ Not applicable |
| **Best For** | Development, Claude Code users | Production, Enterprise |
| **Cost** | Pay per use | Enterprise agreement |
| **Prompt Caching** | ✅ 90% savings | ✅ Automatic |

---

**Need help?** Check the logs for detailed error messages and authentication status.
