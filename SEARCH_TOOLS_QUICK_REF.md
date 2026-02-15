# Search Tools Quick Reference

## 🚀 Quick Setup (30 seconds)

```bash
# 1. Get API key from one of these:
# • Exa: https://exa.ai (Recommended)
# • Perplexity: https://www.perplexity.ai/settings/api
# • Tavily: https://tavily.com

# 2. Add to .env file:
echo 'EXASEARCH_API_KEY=your_key_here' >> .env

# 3. Restart Dexter
bun run start
```

Done! The `web_search` tool is now available. ✅

---

## 📊 Provider Comparison

| Provider | Best For | Free Tier | Speed | Quality |
|----------|----------|-----------|-------|---------|
| **Exa** ⭐ | Tech/AI research | 1,000/mo | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ |
| **Perplexity** | Fact checking | Limited | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ |
| **Tavily** | General search | 1,000/mo | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ |

**Recommendation:** Use Exa for best results.

---

## 🔑 API Keys

### Exa (Recommended)
```bash
# Get key: https://exa.ai
EXASEARCH_API_KEY=exa_your_key_here
```

### Perplexity
```bash
# Get key: https://www.perplexity.ai/settings/api
PERPLEXITY_API_KEY=pplx_your_key_here
```

### Tavily
```bash
# Get key: https://tavily.com
TAVILY_API_KEY=tvly_your_key_here
```

---

## ✅ Testing

### Quick Test
```bash
# Start Dexter
bun run start

# Ask a question
> "What's new in TypeScript 5.4?"

# Agent should use web_search tool automatically
```

### Check Configuration
```bash
# Verify API key is set
grep -E "(EXASEARCH|PERPLEXITY|TAVILY)_API_KEY" .env

# Should show one of:
# EXASEARCH_API_KEY=...
# PERPLEXITY_API_KEY=...
# TAVILY_API_KEY=...
```

---

## 🎯 When Agent Uses web_search

**✅ Automatically uses for:**
- Current events: "What happened at Google I/O?"
- Tech updates: "What's new in React 19?"
- Company info: "Is Anthropic public or private?"
- Recent developments: "Latest AI breakthroughs"

**❌ Does NOT use for:**
- Financial data → Uses `financial_search` instead
- Stock prices → Uses `financial_metrics` instead
- Definitions → Answers from knowledge

---

## 🐛 Common Issues

### Issue: Tool Not Available

**Check:**
```bash
grep -E "(EXASEARCH|PERPLEXITY|TAVILY)_API_KEY" .env
```

**Fix:**
1. Add API key to `.env`
2. Restart Dexter: `bun run start`

### Issue: API Error (401/403)

**Causes:**
- Invalid API key
- Expired key
- No active subscription (Perplexity)

**Fix:**
1. Verify key in provider dashboard
2. Check for typos in `.env`
3. Ensure subscription is active

### Issue: Rate Limit (429)

**Fix:**
1. Wait (most limits reset per minute)
2. Upgrade plan for higher limits
3. Configure fallback provider

---

## 💰 Pricing

| Provider | Free Tier | Cost After Free |
|----------|-----------|-----------------|
| Exa | 1,000/mo | $5/mo (10k) |
| Perplexity | Limited | $20/mo |
| Tavily | 1,000/mo | $29/mo (10k) |

**💡 Tip:** Start with Exa's free tier.

---

## 🔧 Advanced

### Configure Multiple Providers
```bash
# Primary
EXASEARCH_API_KEY=exa_key

# Fallback (commented, uncomment if needed)
# PERPLEXITY_API_KEY=pplx_key
# TAVILY_API_KEY=tvly_key
```

**Priority:** Exa → Perplexity → Tavily

### Increase Result Count

Edit `src/tools/search/exa.ts`:
```typescript
searchArgs: { numResults: 10, text: true }  // Default: 5
```

---

## 📚 Full Documentation

See [SEARCH_TOOLS_SETUP_GUIDE.md](SEARCH_TOOLS_SETUP_GUIDE.md) for:
- Detailed setup instructions
- Provider comparisons
- Troubleshooting guide
- Usage examples
- Best practices

---

## 🎓 Example Queries

**Tech Research:**
```
"What are the new features in Python 3.13?"
"How does GPT-4 Turbo differ from GPT-4?"
"What are the best practices for React Server Components?"
```

**Current Events:**
```
"What happened at the latest Apple event?"
"Recent developments in quantum computing"
"Who won the Nobel Prize in Physics 2026?"
```

**Company Information:**
```
"Is Anthropic a public company?"
"Who is the CEO of OpenAI?"
"What does Mistral AI specialize in?"
```

---

## 🚨 Important Notes

1. **Requires API Key** - At least one provider must be configured
2. **Automatic Selection** - Agent decides when to use search
3. **Priority Order** - Exa > Perplexity > Tavily
4. **Restart Required** - Changes to `.env` need restart
5. **Rate Limits** - Monitor usage in provider dashboards

---

**Quick Links:**
- [Full Setup Guide](SEARCH_TOOLS_SETUP_GUIDE.md)
- [Main README](README.md)
- [Architecture Docs](ARCHITECTURE.md)
- [LLM Provider Switching](SWITCHING_LLM_PROVIDERS.md)

**Last Updated:** 2026-02-14
