# Preventing LLM Hallucinations in Dexter

## What Happened

Dexter claimed to have generated a PDF with a download link:
```
✅ PDF 已生成，可直接下载
👉 下载链接： https://files.dexter.ai/Impulse-Boy-Daily-3Lines-Bilingual-A4.pdf
```

**This is a hallucination.** Dexter cannot:
- ❌ Generate PDF files
- ❌ Create download links
- ❌ Upload files to hosting services

## Why This Happens

LLMs (Large Language Models) sometimes:
1. **Understand user intent** - User wants a PDF
2. **Try to be helpful** - Model wants to fulfill the request
3. **Lack self-awareness** - Model doesn't know its actual limitations
4. **Generate plausible content** - Creates realistic-looking URLs and responses
5. **Speak with false confidence** - Uses ✅ checkmarks and definitive language

This is called **hallucination** - the model invents information that sounds correct but isn't real.

## What Dexter Can ACTUALLY Do

Based on [src/tools/registry.ts](src/tools/registry.ts):

### ✅ Available Tools:
1. **financial_search** - Search for company data, prices, metrics
2. **financial_metrics** - Get detailed financial metrics
3. **read_filings** - Read SEC filings (10-K, 10-Q, etc.)
4. **web_fetch** - Fetch and read web pages
5. **browser** - Automate browser (navigate, click, screenshot)
6. **web_search** - Search the web (Exa/Perplexity/Tavily)
7. **skill** - Run specialized skills/workflows

### ❌ Missing Capabilities:
- ❌ No PDF generation
- ❌ No image generation
- ❌ No file uploads
- ❌ No file hosting
- ❌ No email sending
- ❌ No code execution (beyond tools)

## Fix Applied

Updated [src/agent/prompts.ts](src/agent/prompts.ts) to add explicit constraints:

```typescript
## CRITICAL: What You CANNOT Do

You do NOT have the ability to:
- ❌ Generate, create, or produce PDF files
- ❌ Generate, create, or produce images, charts, or visualizations
- ❌ Upload files to any server or hosting service
- ❌ Create download links or file URLs
- ❌ Send emails or messages outside this conversation
- ❌ Execute code in languages other than what your tools support

If a user asks for any of these capabilities, politely explain what you CAN do instead.

NEVER claim to have completed an action you cannot actually perform.
NEVER provide fake download links or URLs.
```

This explicitly tells the model:
1. What it cannot do
2. How to respond when asked
3. Never to fabricate links or claims

## How to Verify a Response

### Red Flags for Hallucination:

🚩 **Download links** that look fake:
   - `https://files.dexter.ai/...` (Dexter has no file hosting)
   - `https://downloads.dexter.com/...` (Not a real domain)
   - Any URL claiming Dexter generated it

🚩 **File generation claims**:
   - "PDF 已生成" (PDF has been generated)
   - "I've created a document for you"
   - "Download your file here"

🚩 **Overly confident language**:
   - ✅ checkmarks before completing actions
   - "Successfully uploaded to..."
   - "Your file is ready at..."

### How to Check:

1. **Look at the actual tools** - Check [src/tools/registry.ts](src/tools/registry.ts)
2. **Try the link** - Fake URLs will 404
3. **Check the logs** - Real tool calls appear in gateway debug logs
4. **Ask "how did you do that?"** - Hallucinated actions have vague explanations

## Better Responses

### ❌ Hallucinated (Before Fix):
```
✅ PDF 已生成，可直接下载
👉 下载链接： https://files.dexter.ai/file.pdf
```

### ✅ Honest (After Fix):
```
我无法生成 PDF 文件，但我可以帮你准备内容：

**《冲动型男孩｜每日 3 行执行表》**

你可以：
1. 复制以下文本到 Google Docs
2. 使用在线工具（如 Canva）生成 PDF
3. 使用 markdown-to-pdf 转换器

需要我提供具体的文本模板吗？
```

## Testing the Fix

1. **Restart Dexter** - Changes take effect on next startup:
   ```bash
   bun run gateway
   ```

2. **Test with problematic query**:
   ```
   Generate a PDF report for me
   ```

3. **Expected response** (after fix):
   ```
   I cannot generate PDF files, but I can help you create the content.
   Would you like me to format the information so you can easily
   create a PDF using tools like Google Docs or Canva?
   ```

## Additional Improvements

### 1. Add Response Validation

You could add a post-processing check to catch hallucinated URLs:

```typescript
// In gateway.ts after getting the answer
function detectHallucination(answer: string): string | null {
  const suspiciousPatterns = [
    /https?:\/\/(?:files|downloads|cdn)\.dexter\.(ai|com|io)/gi,
    /已生成.*PDF/gi,
    /下载链接[：:]/gi,
    /✅.*PDF.*生成/gi,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(answer)) {
      return 'Response contains potential hallucination (fake file links)';
    }
  }
  return null;
}
```

### 2. Tool Call Monitoring

Log all tool calls to verify actions:

```bash
# Check what tools were actually called
tail -f ~/.dexter/gateway-debug.log | grep "tool"
```

If Dexter claims to generate a PDF but no tool call appears, it's hallucinating.

### 3. User Education

Add to bot responses:
```
📋 Note: I can only use these tools:
• Financial data (stocks, filings, metrics)
• Web search and page fetching
• Browser automation

I cannot generate files or create downloads.
```

## Real-World Examples

### Example 1: PDF Request

**User**: "Create a PDF report of Apple's financials"

**Before Fix** (Hallucination):
```
✅ PDF report generated!
Download: https://files.dexter.ai/AAPL-Report.pdf
```

**After Fix** (Honest):
```
I can provide Apple's financial data, but I cannot generate PDF files.

Here's Apple's latest data:
[financial data here]

To create a PDF:
1. Copy this data to Google Docs
2. File → Download → PDF
```

### Example 2: Image Request

**User**: "Draw me a chart of stock prices"

**Before Fix** (Hallucination):
```
✅ Chart created!
View it here: https://charts.dexter.ai/stock-chart.png
```

**After Fix** (Honest):
```
I cannot create images or charts, but I can provide the data:

AAPL prices (last 5 days):
• 2026-02-10: $182.34
• 2026-02-11: $185.21
...

You can paste this into tools like:
• Google Sheets (chart feature)
• TradingView
• Excel
```

## Monitoring

After deploying the fix, monitor for:

1. **False URLs** in responses:
   ```bash
   grep -i "https://.*dexter\." ~/.dexter/gateway-debug.log
   ```

2. **File generation claims**:
   ```bash
   grep -iE "(generated|created|uploaded).*file" ~/.dexter/gateway-debug.log
   ```

3. **User complaints** about broken links

## Summary

### What Changed:
- ✅ Added explicit "CANNOT DO" section to system prompt
- ✅ Instructed model to never fabricate links
- ✅ Told model to suggest alternatives instead

### Result:
- ✅ Dexter will no longer claim to generate PDFs
- ✅ Dexter will explain its actual capabilities
- ✅ Dexter will suggest real alternatives

### Next Steps:
1. Restart Dexter: `bun run gateway`
2. Test with PDF/image generation requests
3. Monitor logs for any remaining hallucinations
4. Add tool call validation if issues persist

## Files Modified

- [src/agent/prompts.ts](src/agent/prompts.ts) - Added "What You CANNOT Do" section

## Need to Add More Constraints?

If you see other hallucinations, add them to the prompt:

```typescript
## CRITICAL: What You CANNOT Do

You do NOT have the ability to:
- ❌ [Add new constraint here]
```

The more specific you are, the better the model will understand its limitations.
