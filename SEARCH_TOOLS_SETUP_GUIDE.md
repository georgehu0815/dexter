# Web Search Tools Setup Guide

## Overview

Dexter supports **three web search providers** with automatic fallback:
1. **Exa** (Primary) - AI-powered semantic search
2. **Perplexity** (Fallback) - AI search with citations
3. **Tavily** (Fallback) - Traditional web search with LangChain

The agent automatically uses the first available provider based on which API key is configured in your `.env` file.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Search Provider Comparison](#search-provider-comparison)
- [Detailed Setup Instructions](#detailed-setup-instructions)
  - [Option 1: Exa (Recommended)](#option-1-exa-recommended)
  - [Option 2: Perplexity](#option-2-perplexity)
  - [Option 3: Tavily](#option-3-tavily)
- [Configuration](#configuration)
- [Testing Your Setup](#testing-your-setup)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [API Pricing](#api-pricing)

---

## Quick Start

**Step 1:** Choose a search provider (see [comparison](#search-provider-comparison) below)

**Step 2:** Get an API key from your chosen provider

**Step 3:** Add the API key to your `.env` file:

```bash
# Option 1: Exa (Recommended - semantic AI search)
EXASEARCH_API_KEY=your-exa-api-key-here

# Option 2: Perplexity (AI search with citations)
PERPLEXITY_API_KEY=your-perplexity-api-key-here

# Option 3: Tavily (Traditional web search)
TAVILY_API_KEY=your-tavily-api-key-here
```

**Step 4:** Restart Dexter:
```bash
bun run start
```

The `web_search` tool will now be available to the agent! 🎉

---

## Search Provider Comparison

| Feature | Exa | Perplexity | Tavily |
|---------|-----|------------|--------|
| **Search Quality** | ⭐⭐⭐⭐⭐ Semantic AI | ⭐⭐⭐⭐⭐ AI-powered | ⭐⭐⭐⭐ Traditional |
| **Speed** | Fast | Fast | Very Fast |
| **Results Format** | URLs + Content | Answer + Citations | URLs + Snippets |
| **Best For** | AI/Tech research | Factual questions | General queries |
| **Free Tier** | 1,000 requests/mo | Limited | 1,000 requests/mo |
| **Pricing** | $5/mo (pro) | $20/mo | $29/mo |
| **Integration** | LangChain + exa-js | Custom API | LangChain |
| **Setup Difficulty** | ⭐ Easy | ⭐ Easy | ⭐ Easy |
| **Recommended For** | ✅ Most users | Fact checking | Backup option |

### Recommendation

**🏆 Use Exa** for the best experience with AI-powered semantic search. It's optimized for finding technical content, documentation, and research papers.

**Use Perplexity** if you need AI-generated answers with citations instead of raw search results.

**Use Tavily** as a reliable fallback or if you prefer traditional search results.

---

## Detailed Setup Instructions

### Option 1: Exa (Recommended)

**What is Exa?**
Exa is an AI-powered search engine optimized for finding high-quality content, technical documentation, and research papers. It uses semantic understanding to provide more relevant results than traditional search.

#### Get Your API Key

1. **Visit:** [https://exa.ai](https://exa.ai)
2. **Sign up** for a free account
3. **Navigate to:** Dashboard → API Keys
4. **Create** a new API key
5. **Copy** the key (starts with `exa_`)

#### Configure Dexter

Add to your `.env` file:
```bash
EXASEARCH_API_KEY=exa_your_api_key_here
```

#### Verify Installation

```bash
# Check if the key is set
grep EXASEARCH_API_KEY .env

# Restart Dexter
bun run start
```

The agent will automatically use Exa for web searches.

---

### Option 2: Perplexity

**What is Perplexity?**
Perplexity provides AI-powered search that returns a synthesized answer with citations, rather than just raw search results. Great for fact-checking and getting quick answers.

#### Get Your API Key

1. **Visit:** [https://www.perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
2. **Sign up** for an account
3. **Subscribe** to Perplexity API (requires paid plan)
4. **Generate** an API key
5. **Copy** the key (starts with `pplx-`)

#### Configure Dexter

Add to your `.env` file:
```bash
PERPLEXITY_API_KEY=pplx-your_api_key_here
```

#### Verify Installation

```bash
# Check if the key is set
grep PERPLEXITY_API_KEY .env

# Restart Dexter
bun run start
```

The agent will automatically use Perplexity for web searches if no Exa key is configured.

---

### Option 3: Tavily

**What is Tavily?**
Tavily is a search API optimized for LLM applications, providing clean, structured search results from the web.

#### Get Your API Key

1. **Visit:** [https://tavily.com](https://tavily.com)
2. **Sign up** for a free account
3. **Navigate to:** Dashboard → API Keys
4. **Generate** a new API key
5. **Copy** the key (starts with `tvly-`)

#### Configure Dexter

Add to your `.env` file:
```bash
TAVILY_API_KEY=tvly-your_api_key_here
```

#### Verify Installation

```bash
# Check if the key is set
grep TAVILY_API_KEY .env

# Restart Dexter
bun run start
```

The agent will automatically use Tavily for web searches if no Exa or Perplexity keys are configured.

---

## Configuration

### Priority Order

The agent checks for API keys in this order:
1. **EXASEARCH_API_KEY** (highest priority)
2. **PERPLEXITY_API_KEY** (if Exa not available)
3. **TAVILY_API_KEY** (if neither Exa nor Perplexity available)

**Implementation:** See [src/tools/registry.ts:58-77](src/tools/registry.ts#L58-L77)

### Configuring Multiple Providers

You can configure multiple providers for redundancy:

```bash
# Primary
EXASEARCH_API_KEY=exa_your_key

# Fallback (optional)
PERPLEXITY_API_KEY=pplx_your_key
TAVILY_API_KEY=tvly_your_key
```

**Note:** Only the highest priority provider will be used. Fallbacks only activate if you remove the primary key from `.env`.

### Search Results Configuration

Each provider returns up to **5 results** by default:

**Exa Configuration:**
```typescript
// src/tools/search/exa.ts:19
searchArgs: { numResults: 5, text: true }
```

**Tavily Configuration:**
```typescript
// src/tools/search/tavily.ts:12
new TavilySearch({ maxResults: 5 })
```

**Perplexity Configuration:**
```typescript
// src/tools/search/perplexity.ts:39
max_tokens: 4096  // Controls answer length
```

---

## Testing Your Setup

### Method 1: Quick Test

```bash
# Start Dexter
bun run start

# Ask a question that requires web search
> "What are the latest developments in AI?"

# The agent should automatically use the web_search tool
```

### Method 2: Check Tool Registration

Create a test script: `test-search-tool.ts`

```typescript
import { config } from 'dotenv';
import { getTools } from './src/tools/registry.js';

config();

const tools = getTools('claude-sonnet-4-5-20250929');
const searchTool = tools.find(t => t.name === 'web_search');

if (searchTool) {
  console.log('✅ web_search tool is registered!');
  console.log(`Description: ${searchTool.description}`);

  // Test the tool
  try {
    const result = await searchTool.invoke({ query: 'What is TypeScript?' });
    console.log('✅ Search test passed!');
    console.log(`Result: ${result.substring(0, 200)}...`);
  } catch (error) {
    console.error('❌ Search test failed:', error);
  }
} else {
  console.error('❌ web_search tool is NOT registered');
  console.error('Check your API keys in .env file');
}
```

Run the test:
```bash
bun run test-search-tool.ts
```

### Method 3: Check Environment Variables

```bash
# Verify API keys are set
echo "Checking search API keys..."

if [ -n "$EXASEARCH_API_KEY" ]; then
  echo "✅ Exa API key is set"
elif [ -n "$PERPLEXITY_API_KEY" ]; then
  echo "✅ Perplexity API key is set"
elif [ -n "$TAVILY_API_KEY" ]; then
  echo "✅ Tavily API key is set"
else
  echo "❌ No search API key is set"
  echo "Add one of: EXASEARCH_API_KEY, PERPLEXITY_API_KEY, or TAVILY_API_KEY to .env"
fi
```

---

## Usage Examples

### When the Agent Uses web_search

The agent automatically decides when to use the `web_search` tool based on the query type. Here are examples:

#### Example 1: Current Events
```
User: "What happened at the OpenAI conference last week?"

Agent thinking: This requires current information → Uses web_search
Tool: web_search(query: "OpenAI conference last week announcements")
Result: [5 recent articles with URLs and snippets]
```

#### Example 2: Company Status
```
User: "Is Anthropic still a private company?"

Agent thinking: Company status can change → Uses web_search
Tool: web_search(query: "Anthropic company public private status 2026")
Result: [Articles about Anthropic's current status]
```

#### Example 3: Technology Updates
```
User: "What's new in React 19?"

Agent thinking: Framework updates require current info → Uses web_search
Tool: web_search(query: "React 19 new features release")
Result: [Documentation and blog posts about React 19]
```

### When NOT to Use web_search

The agent is instructed NOT to use web_search for:

❌ **Financial data** (uses `financial_search` instead)
```
User: "What is Apple's revenue?"
→ Uses financial_search, not web_search
```

❌ **Conceptual questions** (answers from knowledge)
```
User: "What is a neural network?"
→ Answers directly without tools
```

❌ **Stock prices** (uses `financial_metrics` instead)
```
User: "What's TSLA's current stock price?"
→ Uses financial_metrics, not web_search
```

### Manual Tool Invocation (Testing)

You can manually test each provider:

```typescript
import { exaSearch } from './src/tools/search/exa.js';
import { perplexitySearch } from './src/tools/search/perplexity.js';
import { tavilySearch } from './src/tools/search/tavily.js';

// Test Exa
const exaResult = await exaSearch.invoke({ query: 'AI agents' });
console.log('Exa Result:', exaResult);

// Test Perplexity
const pplxResult = await perplexitySearch.invoke({ query: 'AI agents' });
console.log('Perplexity Result:', pplxResult);

// Test Tavily
const tavilyResult = await tavilySearch.invoke({ query: 'AI agents' });
console.log('Tavily Result:', tavilyResult);
```

---

## Troubleshooting

### Problem: web_search Tool Not Available

**Symptoms:**
- Agent doesn't use web_search
- "No search tool available" in logs

**Solution:**
1. Check if any search API key is set:
   ```bash
   grep -E "(EXASEARCH|PERPLEXITY|TAVILY)_API_KEY" .env
   ```
2. If no keys are set, add at least one (see [Setup](#detailed-setup-instructions))
3. Restart Dexter: `bun run start`

### Problem: API Key Invalid

**Symptoms:**
- Error: `[Exa API] 401: Unauthorized`
- Error: `[Perplexity API] 403: Forbidden`
- Error: `[Tavily API] Invalid API key`

**Solution:**
1. Verify your API key in the provider's dashboard
2. Check for typos in `.env` file
3. Ensure key hasn't expired
4. For Perplexity: Verify you have an active paid subscription

### Problem: Rate Limit Exceeded

**Symptoms:**
- Error: `[Exa API] 429: Too Many Requests`
- Error: `[Perplexity API] Rate limit exceeded`

**Solution:**
1. **Wait** - Most providers have per-minute limits
2. **Upgrade plan** - Consider paid tier for higher limits
3. **Add fallback** - Configure multiple providers:
   ```bash
   EXASEARCH_API_KEY=primary_key
   PERPLEXITY_API_KEY=fallback_key  # Manually switch if needed
   ```

### Problem: Search Returns No Results

**Symptoms:**
- Empty results array
- "No relevant results found"

**Solution:**
1. **Check query** - Make it more specific
2. **Try different provider** - Switch between Exa/Perplexity/Tavily
3. **Verify API status** - Check provider's status page

### Problem: Environment Variable Not Loading

**Symptoms:**
- API key is in `.env` but not recognized

**Solution:**
1. **Restart Dexter** - Changes require restart
2. **Check .env location** - Must be in project root
3. **Check syntax** - No spaces around `=`
   ```bash
   # ✅ Correct
   EXASEARCH_API_KEY=your_key

   # ❌ Wrong
   EXASEARCH_API_KEY = your_key
   ```
4. **Verify loading** - Check if dotenv is configured:
   ```typescript
   // src/index.tsx:8
   config({ quiet: true });
   ```

---

## Best Practices

### 1. Choose the Right Provider

| Use Case | Recommended Provider |
|----------|---------------------|
| **Technical documentation** | Exa |
| **Academic research** | Exa |
| **Fact checking** | Perplexity |
| **Current news** | Perplexity or Tavily |
| **General queries** | Any (Exa preferred) |

### 2. Query Optimization

**✅ Good Queries:**
- "React 19 new features and breaking changes"
- "Anthropic Claude API rate limits 2026"
- "TypeScript 5.4 release notes"

**❌ Poor Queries:**
- "react" (too vague)
- "stuff about AI" (not specific)
- "tell me everything about..." (too broad)

### 3. API Key Security

**✅ Do:**
- Store keys in `.env` file (git-ignored)
- Use environment variables in production
- Rotate keys periodically
- Use read-only keys if available

**❌ Don't:**
- Commit API keys to git
- Share keys publicly
- Hardcode keys in source files
- Use the same key across multiple projects

### 4. Cost Management

**Monitor Usage:**
- Check provider dashboards regularly
- Set up usage alerts if available
- Track costs per query

**Optimize Costs:**
- Use free tiers for development
- Upgrade only when needed
- Consider caching results for repeated queries

### 5. Fallback Strategy

**Configure Multiple Providers:**
```bash
# Primary (free tier)
EXASEARCH_API_KEY=exa_key_here

# Keep fallback keys ready (commented)
# PERPLEXITY_API_KEY=pplx_key_here
# TAVILY_API_KEY=tvly_key_here
```

**When to Switch:**
- Primary hits rate limit
- Primary service downtime
- Testing different result quality

---

## API Pricing

### Exa
- **Free Tier:** 1,000 requests/month
- **Pro Plan:** $5/month - 10,000 requests
- **Enterprise:** Custom pricing
- **Website:** [https://exa.ai/pricing](https://exa.ai/pricing)

### Perplexity
- **Free Tier:** Limited (requires account)
- **API Access:** $20/month (paid plan required)
- **Enterprise:** Custom pricing
- **Website:** [https://www.perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)

### Tavily
- **Free Tier:** 1,000 requests/month
- **Pro Plan:** $29/month - 10,000 requests
- **Enterprise:** Custom pricing
- **Website:** [https://tavily.com/pricing](https://tavily.com/pricing)

### Cost Comparison (Per 1,000 Requests)

| Provider | Free | Paid Plan |
|----------|------|-----------|
| Exa | Free (first 1k) | $0.50 |
| Perplexity | Limited | ~$1-2 (estimate) |
| Tavily | Free (first 1k) | $2.90 |

**💡 Recommendation:** Start with Exa's free tier for development, upgrade to Pro if needed.

---

## Architecture Overview

### File Structure

```
src/tools/search/
├── exa.ts           # Exa search implementation
├── perplexity.ts    # Perplexity search implementation
├── tavily.ts        # Tavily search implementation
└── index.ts         # Export all search tools

src/tools/
├── registry.ts      # Tool registration with priority
├── types.ts         # Shared types and utilities
└── descriptions/
    └── web-search.ts  # LLM guidance for web_search
```

### Registration Logic

```typescript
// src/tools/registry.ts:58-77
// Priority: Exa → Perplexity → Tavily
if (process.env.EXASEARCH_API_KEY) {
  tools.push({ name: 'web_search', tool: exaSearch, ... });
} else if (process.env.PERPLEXITY_API_KEY) {
  tools.push({ name: 'web_search', tool: perplexitySearch, ... });
} else if (process.env.TAVILY_API_KEY) {
  tools.push({ name: 'web_search', tool: tavilySearch, ... });
}
```

### Search Flow

```
User Query
    ↓
Agent analyzes query
    ↓
Decision: Need web search?
    ↓ Yes
Agent calls web_search tool
    ↓
Registry routes to configured provider (Exa/Perplexity/Tavily)
    ↓
Provider API call
    ↓
Results formatted and returned
    ↓
Agent synthesizes answer with citations
```

---

## Advanced Configuration

### Customize Result Count

Edit the tool files to change the number of results:

**Exa ([src/tools/search/exa.ts:19](src/tools/search/exa.ts#L19)):**
```typescript
searchArgs: { numResults: 10, text: true }  // Change from 5 to 10
```

**Tavily ([src/tools/search/tavily.ts:12](src/tools/search/tavily.ts#L12)):**
```typescript
new TavilySearch({ maxResults: 10 })  // Change from 5 to 10
```

**Perplexity ([src/tools/search/perplexity.ts:39](src/tools/search/perplexity.ts#L39)):**
```typescript
max_tokens: 8192  // Increase for longer answers
```

### Add Custom Search Provider

1. Create new file: `src/tools/search/custom.ts`
2. Implement `DynamicStructuredTool` with `web_search` name
3. Add to `src/tools/search/index.ts`
4. Update `src/tools/registry.ts` priority logic

Example template:
```typescript
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

export const customSearch = new DynamicStructuredTool({
  name: 'web_search',
  description: 'Search the web...',
  schema: z.object({
    query: z.string().describe('Search query'),
  }),
  func: async (input) => {
    // Your custom API call
    const results = await fetch(`https://api.example.com/search?q=${input.query}`);
    return formatToolResult(await results.json());
  },
});
```

---

## Related Documentation

- **Tool Registry:** [src/tools/registry.ts](src/tools/registry.ts) - Tool registration logic
- **Tool Descriptions:** [src/tools/descriptions/web-search.ts](src/tools/descriptions/web-search.ts) - LLM guidance
- **Agent System:** [ARCHITECTURE.md](ARCHITECTURE.md#tool-system) - How tools integrate with agent
- **Main README:** [README.md](README.md) - Project overview
- **Environment Setup:** [.env](.env) - Configuration file

---

## Summary

### Quick Checklist

- [ ] Choose a search provider (Exa recommended)
- [ ] Get API key from provider dashboard
- [ ] Add key to `.env` file
- [ ] Restart Dexter
- [ ] Test with a web search query
- [ ] Monitor usage and costs

### Key Takeaways

✅ **Multiple Options** - Choose from Exa, Perplexity, or Tavily
✅ **Automatic Fallback** - Configure priority order
✅ **Easy Setup** - Just add API key to `.env`
✅ **Intelligent Routing** - Agent decides when to use search
✅ **Cost Effective** - Free tiers available for development

---

**Need Help?**
- Check [Troubleshooting](#troubleshooting) section
- Review [API documentation](#api-pricing) for your provider
- See [ARCHITECTURE.md](ARCHITECTURE.md) for system design

**Last Updated:** 2026-02-14
