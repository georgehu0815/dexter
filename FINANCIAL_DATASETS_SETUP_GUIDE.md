# Financial Datasets API Setup Guide

## Overview

Dexter integrates with [Financial Datasets](https://financialdatasets.ai) to provide comprehensive financial data including:
- **Stock prices and historical data**
- **Company fundamentals** (income statements, balance sheets, cash flow)
- **Financial news** and market updates
- **SEC filings** (10-K, 10-Q, 8-K)
- **Financial metrics** and ratios

The Financial Datasets API is **required** for all finance-related tools in Dexter.

---

## Table of Contents

- [Quick Start](#quick-start)
- [What is Financial Datasets?](#what-is-financial-datasets)
- [Detailed Setup Instructions](#detailed-setup-instructions)
- [Configuration](#configuration)
- [Testing Your Setup](#testing-your-setup)
- [Available Financial Tools](#available-financial-tools)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [API Pricing](#api-pricing)

---

## Quick Start

**Step 1:** Get your API key from [Financial Datasets](https://financialdatasets.ai)

**Step 2:** Add the API key to your `.env` file:

```bash
FINANCIAL_DATASETS_API_KEY=your-financial-datasets-api-key-here
```

**Step 3:** Restart Dexter:
```bash
bun run start
```

All financial tools are now available! 🎉

---

## What is Financial Datasets?

Financial Datasets is a comprehensive financial data API that provides:

### Key Features
- ✅ **Real-time and historical stock prices**
- ✅ **Company fundamentals** - Income statements, balance sheets, cash flows
- ✅ **Financial news** - Company-specific and market news
- ✅ **SEC filings** - Access to official regulatory documents
- ✅ **Financial metrics** - P/E ratios, market cap, revenue growth, and more
- ✅ **Clean, structured data** - Optimized for AI/ML applications
- ✅ **Fast API responses** - Low latency for real-time applications

### Why Financial Datasets?
- 🏆 **High-quality data** - Sourced directly from official sources
- 💰 **Cost-effective** - Competitive pricing with generous free tier
- 🚀 **Developer-friendly** - Simple REST API with excellent documentation
- 📊 **Comprehensive coverage** - 10,000+ stocks with historical data

---

## Detailed Setup Instructions

### Step 1: Get Your API Key

1. **Visit:** [https://financialdatasets.ai](https://financialdatasets.ai)
2. **Sign up** for a free account
3. **Navigate to:** Dashboard → API Keys
4. **Generate** a new API key
5. **Copy** the key (format: `fd_xxxxx` or UUID format)

> **💡 Tip:** Financial Datasets offers a free tier perfect for development and testing.

### Step 2: Configure Dexter

Open your `.env` file and add the API key:

```bash
# Stock Market API Key
FINANCIAL_DATASETS_API_KEY=11da175a-4a4c-4e03-8c65-06ac5c02e544
```

**Location:** `/Users/ghu/aiworker/dexter/.env` (or your project root)

### Step 3: Verify Configuration

Check that the key is properly set:

```bash
# Verify the key is in your .env file
grep FINANCIAL_DATASETS_API_KEY .env

# Should output:
# FINANCIAL_DATASETS_API_KEY=your-actual-api-key
```

### Step 4: Restart Dexter

```bash
# Stop the current instance (Ctrl+C)
# Start Dexter
bun run start
```

The financial tools will automatically load with your API key! ✅

---

## Configuration

### Environment Variable

The API key is loaded from the `.env` file at runtime:

**Implementation:** [src/tools/finance/api.ts:27](src/tools/finance/api.ts#L27)
```typescript
const FINANCIAL_DATASETS_API_KEY = process.env.FINANCIAL_DATASETS_API_KEY;
```

### API Base URL

All financial tools use the following base URL:

```typescript
const BASE_URL = 'https://api.financialdatasets.ai';
```

**Implementation:** [src/tools/finance/api.ts:4](src/tools/finance/api.ts#L4)

### Authentication

The API key is sent via the `x-api-key` header:

**Implementation:** [src/tools/finance/api.ts:50](src/tools/finance/api.ts#L50)
```typescript
headers: {
  'x-api-key': FINANCIAL_DATASETS_API_KEY || '',
}
```

### Caching

Dexter implements intelligent caching for financial data:

- **Cacheable data:** Historical prices, fundamentals, SEC filings
- **Non-cacheable data:** Real-time prices, latest news
- **Cache location:** Local file system for fast retrieval
- **Benefits:** Reduces API calls, improves response time, lowers costs

**Implementation:** [src/utils/cache.ts](src/utils/cache.ts)

---

## Testing Your Setup

### Method 1: Quick Test (Recommended)

```bash
# Start Dexter
bun run start

# Ask a financial question
> "What is Apple's current stock price?"

# The agent should use financial tools automatically
# Expected: Uses financial_metrics tool → Returns AAPL price
```

### Method 2: Test Specific Tools

Try these queries to test different financial tools:

```bash
# Test financial_metrics
> "What is Microsoft's market cap?"

# Test financial_search (news)
> "Show me recent news about Tesla"

# Test financial_fundamentals
> "What is Google's revenue for the last quarter?"

# Test read_filings
> "Show me the latest 10-K for Amazon"
```

### Method 3: Check API Key Loading

Create a test script: `test-financial-api.ts`

```typescript
import { config } from 'dotenv';
config();

const apiKey = process.env.FINANCIAL_DATASETS_API_KEY;

if (!apiKey) {
  console.error('❌ FINANCIAL_DATASETS_API_KEY is not set');
  console.error('Add it to your .env file and restart');
  process.exit(1);
}

if (apiKey === 'your-api-key') {
  console.error('❌ FINANCIAL_DATASETS_API_KEY is still the placeholder value');
  console.error('Replace it with your actual API key from financialdatasets.ai');
  process.exit(1);
}

console.log('✅ FINANCIAL_DATASETS_API_KEY is configured');
console.log(`Key format: ${apiKey.substring(0, 8)}...`);

// Test API call
const testUrl = `https://api.financialdatasets.ai/prices/?ticker=AAPL&limit=1`;
const response = await fetch(testUrl, {
  headers: { 'x-api-key': apiKey }
});

if (response.ok) {
  console.log('✅ API key is valid - test call succeeded');
  const data = await response.json();
  console.log('Sample data:', JSON.stringify(data, null, 2));
} else {
  console.error(`❌ API call failed: ${response.status} ${response.statusText}`);
  if (response.status === 401) {
    console.error('Your API key is invalid. Get a new one from financialdatasets.ai');
  }
}
```

Run the test:
```bash
bun run test-financial-api.ts
```

---

## Available Financial Tools

Dexter provides **4 main financial tools** powered by Financial Datasets:

### 1. financial_metrics
**Purpose:** Get current stock prices, market cap, and key financial metrics

**Example queries:**
- "What is Tesla's stock price?"
- "Show me Apple's market capitalization"
- "What is the P/E ratio for Microsoft?"

**Implementation:** [src/tools/finance/metrics.ts](src/tools/finance/metrics.ts)

---

### 2. financial_search (News)
**Purpose:** Search for company-specific financial news and market updates

**Example queries:**
- "Show me recent news about NVIDIA"
- "What's the latest news on Amazon earnings?"
- "Find news about the tech sector"

**Implementation:** [src/tools/finance/news.ts](src/tools/finance/news.ts)

**API Endpoint:** `/news/`

---

### 3. financial_fundamentals
**Purpose:** Access detailed financial statements and fundamentals

**Available data:**
- Income statements (revenue, earnings, expenses)
- Balance sheets (assets, liabilities, equity)
- Cash flow statements

**Example queries:**
- "What is Google's quarterly revenue?"
- "Show me Meta's income statement"
- "What are Apple's total assets?"

**Implementation:** [src/tools/finance/fundamentals.ts](src/tools/finance/fundamentals.ts)

**API Endpoint:** `/financials/income-statements/`, `/financials/balance-sheets/`, `/financials/cash-flow-statements/`

---

### 4. read_filings
**Purpose:** Search and retrieve SEC filings (10-K, 10-Q, 8-K, etc.)

**Example queries:**
- "Show me Amazon's latest 10-K filing"
- "Find Tesla's most recent quarterly report"
- "Get Microsoft's latest 8-K"

**Implementation:** [src/tools/finance/filings.ts](src/tools/finance/filings.ts)

**API Endpoint:** `/filings/`

---

## Usage Examples

### Example 1: Stock Price Query

```
User: "What is Apple's current stock price?"

Agent thinking: Need current stock data → Uses financial_metrics
Tool: financial_metrics({ ticker: "AAPL" })
API Call: GET https://api.financialdatasets.ai/prices/?ticker=AAPL&limit=1
Result: {
  ticker: "AAPL",
  price: 175.43,
  date: "2026-02-15",
  change: +2.34,
  change_percent: +1.35%
}

Agent response: "Apple (AAPL) is currently trading at $175.43, up $2.34 (+1.35%) today."
```

### Example 2: Company News

```
User: "Show me recent news about Tesla"

Agent thinking: Need company news → Uses financial_search
Tool: financial_search({ ticker: "TSLA", limit: 5 })
API Call: GET https://api.financialdatasets.ai/news/?ticker=TSLA&limit=5
Result: [5 recent news articles with titles, summaries, and URLs]

Agent response: "Here are the 5 most recent news articles about Tesla (TSLA):
1. Tesla Q4 Earnings Beat Expectations - Published 2 hours ago
2. New Tesla Model Y Production Facility Announced - Published 5 hours ago
..."
```

### Example 3: Financial Fundamentals

```
User: "What was Microsoft's revenue last quarter?"

Agent thinking: Need quarterly financials → Uses financial_fundamentals
Tool: financial_fundamentals({ ticker: "MSFT", statement: "income", period: "quarterly", limit: 1 })
API Call: GET https://api.financialdatasets.ai/financials/income-statements/?ticker=MSFT&period=quarterly&limit=1
Result: {
  ticker: "MSFT",
  period: "Q4 2025",
  revenue: 64.7B,
  net_income: 23.2B,
  ...
}

Agent response: "Microsoft's revenue for Q4 2025 was $64.7 billion, with net income of $23.2 billion."
```

### Example 4: SEC Filings

```
User: "Show me Amazon's latest 10-K"

Agent thinking: Need SEC filing → Uses read_filings
Tool: read_filings({ ticker: "AMZN", form_type: "10-K", limit: 1 })
API Call: GET https://api.financialdatasets.ai/filings/?ticker=AMZN&form_type=10-K&limit=1
Result: {
  ticker: "AMZN",
  form_type: "10-K",
  filing_date: "2026-02-01",
  url: "https://www.sec.gov/...",
  excerpt: "..."
}

Agent response: "Amazon's most recent 10-K was filed on February 1, 2026. [Link to filing]"
```

---

## Troubleshooting

### Problem: 401 Unauthorized Error

**Symptoms:**
```
[ERROR] [Financial Datasets API] error: /news/ (AAPL) — 401 Unauthorized
```

**Causes:**
1. API key not set in `.env` file
2. API key is still the placeholder value `your-api-key`
3. API key is invalid or expired

**Solutions:**

**Solution 1: Check if key is set**
```bash
grep FINANCIAL_DATASETS_API_KEY .env
```

**Solution 2: Verify it's not a placeholder**
```bash
# Should NOT show "your-api-key"
cat .env | grep FINANCIAL_DATASETS_API_KEY
```

**Solution 3: Get a new API key**
1. Visit [https://financialdatasets.ai](https://financialdatasets.ai)
2. Log in to your dashboard
3. Generate a new API key
4. Update `.env` file
5. Restart Dexter

**Solution 4: Verify API key format**
```bash
# Valid formats:
# - UUID: 11da175a-4a4c-4e03-8c65-06ac5c02e544
# - Prefixed: fd_xxxxxxxxxxxxx

# Invalid:
# - your-api-key (placeholder)
# - Empty string
```

---

### Problem: Financial Tools Not Working

**Symptoms:**
- Agent doesn't use financial tools
- "Financial tool not available" error
- API calls fail silently

**Solution:**

**Step 1: Check API key is loaded**
```bash
# Create a test file
cat > check-env.ts << 'EOF'
import { config } from 'dotenv';
config();
console.log('API Key:', process.env.FINANCIAL_DATASETS_API_KEY ? 'Set ✅' : 'Not Set ❌');
EOF

bun run check-env.ts
```

**Step 2: Verify .env file location**
```bash
# Must be in project root
ls -la .env
# Should show: -rw-r--r--  1 user  staff  xxxx Feb 15 10:00 .env
```

**Step 3: Check for syntax errors in .env**
```bash
# ✅ Correct
FINANCIAL_DATASETS_API_KEY=11da175a-4a4c-4e03-8c65-06ac5c02e544

# ❌ Wrong - no spaces around =
FINANCIAL_DATASETS_API_KEY = 11da175a-4a4c-4e03-8c65-06ac5c02e544

# ❌ Wrong - no quotes
FINANCIAL_DATASETS_API_KEY="11da175a-4a4c-4e03-8c65-06ac5c02e544"
```

**Step 4: Restart Dexter**
```bash
# Stop current instance (Ctrl+C)
bun run start
```

---

### Problem: Rate Limit Exceeded

**Symptoms:**
```
[ERROR] [Financial Datasets API] error: /prices/ (AAPL) — 429 Too Many Requests
```

**Solutions:**
1. **Wait** - Rate limits reset after a time period
2. **Check your plan** - Upgrade if you need higher limits
3. **Use caching** - Dexter automatically caches historical data
4. **Optimize queries** - Batch requests when possible

**Check your rate limit:**
```bash
# Visit your dashboard
open https://financialdatasets.ai/dashboard
```

---

### Problem: Invalid Ticker Symbol

**Symptoms:**
```
[ERROR] [Financial Datasets API] error: /prices/ (INVALID) — 404 Not Found
```

**Solutions:**
1. **Verify ticker symbol** - Use official symbols (AAPL, MSFT, TSLA)
2. **Check exchange** - Some tickers require exchange prefix (e.g., TSE:SHOP)
3. **Use search** - If unsure, use the financial_search tool first

**Common mistakes:**
```bash
# ❌ Wrong
APPLE → Use AAPL
Microsoft → Use MSFT
Tesla → Use TSLA

# ✅ Correct
AAPL, MSFT, TSLA, GOOGL, AMZN, META, NVDA
```

---

### Problem: No Data Returned

**Symptoms:**
- API call succeeds (200 OK)
- But returns empty results

**Solutions:**
1. **Check date range** - Some data may not be available for all dates
2. **Verify ticker** - Company may be too new or delisted
3. **Check data type** - Not all data is available for all companies

---

### Problem: Environment Variable Not Loading

**Symptoms:**
- `.env` file has correct key
- But `process.env.FINANCIAL_DATASETS_API_KEY` is undefined

**Solutions:**

**Solution 1: Verify dotenv is configured**
```typescript
// src/index.tsx should have:
import { config } from 'dotenv';
config({ quiet: true });
```

**Solution 2: Check file permissions**
```bash
ls -la .env
# Should be readable: -rw-r--r--
```

**Solution 3: No spaces or quotes**
```bash
# ✅ Correct
FINANCIAL_DATASETS_API_KEY=your-key-here

# ❌ Wrong
FINANCIAL_DATASETS_API_KEY = "your-key-here"
```

**Solution 4: Restart your terminal**
```bash
# If running in shell, restart terminal
# If running as a service, restart the process
```

---

## Best Practices

### 1. API Key Security

**✅ Do:**
- Store keys in `.env` file (automatically git-ignored)
- Use environment variables in production
- Rotate keys periodically (quarterly)
- Keep separate keys for dev/staging/production

**❌ Don't:**
- Commit API keys to git repositories
- Share keys publicly or in screenshots
- Hardcode keys in source code
- Use production keys for development

### 2. Cost Optimization

**Monitor Your Usage:**
```bash
# Check your API usage dashboard
open https://financialdatasets.ai/dashboard/usage
```

**Leverage Caching:**
- Dexter automatically caches historical data
- Reduces redundant API calls
- Saves costs on repeated queries

**Batch Requests:**
```typescript
// ✅ Good - Single request for multiple tickers
financial_metrics({ tickers: ["AAPL", "MSFT", "GOOGL"] })

// ❌ Less efficient - Multiple separate requests
financial_metrics({ ticker: "AAPL" })
financial_metrics({ ticker: "MSFT" })
financial_metrics({ ticker: "GOOGL" })
```

### 3. Query Optimization

**✅ Good Queries:**
- "What is AAPL's current price?" (specific ticker)
- "Show me TSLA's Q4 2025 revenue" (specific period)
- "Get the latest 10-K for AMZN" (specific filing)

**❌ Poor Queries:**
- "Tell me about Apple stock" (too vague)
- "Show me all financial data for Tesla" (too broad)
- "What happened to the market today?" (use web_search instead)

### 4. Error Handling

**Graceful Degradation:**
```typescript
// The agent automatically handles failures
// If financial data is unavailable, it will:
// 1. Retry once
// 2. Return cached data if available
// 3. Inform the user if data cannot be retrieved
```

**User-Friendly Messages:**
```
✅ "I couldn't retrieve AAPL's stock price due to an API error. Please try again."
❌ "Error 401: Unauthorized access to /prices/ endpoint"
```

### 5. Data Interpretation

**Always Provide Context:**
```
✅ "Apple's stock price is $175.43, up $2.34 (+1.35%) from yesterday's close."
❌ "175.43"
```

**Include Timestamps:**
```
✅ "Based on data from February 15, 2026..."
❌ "The current price is..." (ambiguous)
```

**Cite Data Sources:**
```
✅ "According to the latest 10-K filing dated Feb 1, 2026..."
❌ "The company reported..." (no source)
```

---

## API Pricing

### Financial Datasets Pricing

**Free Tier:**
- 1,000 API calls/month
- All endpoints included
- No credit card required
- Perfect for development and testing

**Pro Plan:**
- $29/month
- 10,000 API calls/month
- Priority support
- Advanced features

**Enterprise:**
- Custom pricing
- Unlimited API calls
- Dedicated support
- Custom data feeds
- SLA guarantees

**Website:** [https://financialdatasets.ai/pricing](https://financialdatasets.ai/pricing)

### Cost Per Request

| Plan | Monthly Cost | Requests Included | Cost Per Request |
|------|--------------|-------------------|------------------|
| Free | $0 | 1,000 | $0 |
| Pro | $29 | 10,000 | $0.0029 |
| Enterprise | Custom | Unlimited | Negotiable |

### Cost Optimization Tips

1. **Use caching** - Reduces repeat calls for historical data
2. **Batch requests** - Get multiple tickers in one call
3. **Start with free tier** - Upgrade only when needed
4. **Monitor usage** - Check dashboard regularly
5. **Cache locally** - Store frequently accessed data

---

## Architecture Overview

### File Structure

```
src/tools/finance/
├── api.ts            # Core API client with caching
├── metrics.ts        # Stock prices and financial metrics
├── news.ts           # Financial news search
├── fundamentals.ts   # Income statements, balance sheets, cash flow
├── filings.ts        # SEC filings (10-K, 10-Q, 8-K)
└── index.ts          # Export all financial tools

src/utils/
├── cache.ts          # Caching system for API responses
└── logger.ts         # Logging utility for API calls
```

### API Client Architecture

**Core API Module:** [src/tools/finance/api.ts](src/tools/finance/api.ts)

```typescript
// Key features:
// 1. Lazy API key loading (after dotenv initializes)
// 2. Automatic caching for immutable data
// 3. Error handling with descriptive messages
// 4. URL parameter handling (including arrays)
```

### Tool Flow

```
User Query
    ↓
Agent analyzes → Determines need for financial data
    ↓
Agent selects appropriate tool
    ↓
Tool calls api.ts client
    ↓
Client checks cache (if cacheable)
    ↓ Cache miss
API call to Financial Datasets
    ↓
Response processed and formatted
    ↓
Cache stored (if cacheable)
    ↓
Result returned to agent
    ↓
Agent synthesizes answer
```

### Caching Strategy

**Cacheable Data:**
- ✅ Historical stock prices
- ✅ Quarterly/annual financial statements
- ✅ SEC filings (immutable once published)

**Non-cacheable Data:**
- ❌ Real-time stock prices
- ❌ Latest financial news
- ❌ Market data (constantly changing)

**Implementation:** [src/utils/cache.ts](src/utils/cache.ts)

---

## Related Documentation

- **Financial Tools:**
  - [src/tools/finance/api.ts](src/tools/finance/api.ts) - Core API client
  - [src/tools/finance/metrics.ts](src/tools/finance/metrics.ts) - Stock metrics
  - [src/tools/finance/news.ts](src/tools/finance/news.ts) - Financial news
  - [src/tools/finance/fundamentals.ts](src/tools/finance/fundamentals.ts) - Fundamentals
  - [src/tools/finance/filings.ts](src/tools/finance/filings.ts) - SEC filings

- **Utilities:**
  - [src/utils/cache.ts](src/utils/cache.ts) - Caching system
  - [src/utils/logger.ts](src/utils/logger.ts) - Logging utility

- **Configuration:**
  - [.env](.env) - Environment configuration
  - [env.example](env.example) - Environment template

- **Project Documentation:**
  - [README.md](README.md) - Project overview
  - [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture

---

## Summary

### Quick Checklist

- [ ] Sign up at [financialdatasets.ai](https://financialdatasets.ai)
- [ ] Generate API key from dashboard
- [ ] Add `FINANCIAL_DATASETS_API_KEY` to `.env` file
- [ ] Verify key is not the placeholder `your-api-key`
- [ ] Restart Dexter
- [ ] Test with a financial query
- [ ] Monitor usage in dashboard

### Key Takeaways

✅ **Required for Financial Tools** - All 4 finance tools need this API key
✅ **Simple Setup** - Just add API key to `.env` and restart
✅ **Automatic Caching** - Reduces costs and improves performance
✅ **Comprehensive Data** - Prices, fundamentals, news, and SEC filings
✅ **Free Tier Available** - 1,000 requests/month for development

### Common Errors & Solutions

| Error | Solution |
|-------|----------|
| 401 Unauthorized | Add valid API key to `.env` |
| 404 Not Found | Check ticker symbol is valid |
| 429 Rate Limit | Wait or upgrade plan |
| Empty results | Verify date range and ticker |
| Key not loading | Check `.env` syntax, restart app |

---

**Need Help?**
- Check [Troubleshooting](#troubleshooting) section
- Visit [Financial Datasets Documentation](https://financialdatasets.ai/docs)
- Review [API Reference](https://financialdatasets.ai/docs/api)
- Contact support: support@financialdatasets.ai

**Last Updated:** 2026-02-15
