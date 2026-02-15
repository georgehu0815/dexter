# WhatsApp Bot Differentiation Setup

You now have **message prefix filtering** configured so you can run both bots on the same WhatsApp number and control which one responds.

## How It Works

- Messages starting with `@dexter` will be processed by the Dexter bot
- Messages starting with `@clawdbot` will be processed by the clawdbot bot
- Each bot only responds to messages with its own prefix
- The prefix is stripped before processing, so the bot sees the actual question

## Configuration Files

Two configuration files have been created:

1. **gateway-dexter.json** - Configuration for Dexter bot
2. **gateway-clawdbot.json** - Configuration for clawdbot bot

Each has the `botName` field set to differentiate between them.

## Setup Instructions

### Option 1: Run Separate Instances (Recommended)

Run two separate gateway instances, each with its own config:

**Terminal 1 - Dexter Bot:**
```bash
cd /Users/ghu/aiworker/dexter
DEXTER_GATEWAY_CONFIG=./gateway-dexter.json bun run gateway
```

**Terminal 2 - clawdbot Bot:**
```bash
cd /path/to/clawdbot
DEXTER_GATEWAY_CONFIG=./gateway-clawdbot.json bun run gateway
```

### Option 2: Update Existing Config

If you only want to run one bot at a time, update your `~/.dexter/gateway.json`:

```json
{
  "gateway": {
    "accountId": "default",
    "botName": "dexter",
    "logLevel": "info"
  },
  "channels": {
    "whatsapp": {
      "enabled": true,
      "accounts": {},
      "allowFrom": ["+13522355298"]
    }
  },
  "bindings": []
}
```

Change `botName` to either `"dexter"` or `"clawdbot"` depending on which bot you want active.

## Usage Examples

### Talking to Dexter
```
@dexter what features do you have?
```

Bot sees: `what features do you have?`

Response: `[Dexter] I provide financial research capabilities including...`

### Talking to clawdbot
```
@clawdbot how's it going?
```

Bot sees: `how's it going?`

Response: `[clawdbot] Hey! Doing well — ready to help. What's up?`

### Messages Without Prefix

If you send a message **without a prefix**, the behavior depends on your configuration:
- If `botName` is configured: **IGNORES** the message (assumes it's for the other bot)
- If `botName` is not configured: **PROCESSES** the message (backwards compatible)

## Testing

1. Start both bots using Option 1 above
2. Send a test message to your WhatsApp:
   ```
   @dexter hello
   ```
3. You should see only Dexter respond
4. Send another test:
   ```
   @clawdbot hello
   ```
5. You should see only clawdbot respond

## Troubleshooting

### Both bots still responding
- Verify each bot is using the correct config file
- Check the logs in `~/.dexter/gateway-debug.log`
- Ensure `botName` is set correctly in each config

### No bots responding
- Check that you're using the correct prefix (@dexter or @clawdbot)
- Verify the bot name matches the configured `botName` (case-insensitive)
- Make sure at least one bot is running

### Bot doesn't understand the question
- Ensure there's a **space** after the prefix: `@dexter hello` not `@dexterhello`

## Configuration Reference

### botName field

```json
{
  "gateway": {
    "botName": "dexter"  // or "clawdbot"
  }
}
```

- **Required**: No (optional field)
- **Type**: string
- **Case-insensitive**: Yes (@Dexter, @dexter, @DEXTER all work)
- **Backward compatible**: If not set, bot processes all messages (old behavior)

## Advanced: Different Authentication/Models

You can also configure each bot to use different:

**Dexter (Azure OpenAI):**
```bash
cd /Users/ghu/aiworker/dexter
DEXTER_GATEWAY_CONFIG=./gateway-dexter.json bun run gateway
```

Uses `.env` with Azure OpenAI configuration.

**clawdbot (OpenAI):**
```bash
cd /path/to/clawdbot
DEXTER_GATEWAY_CONFIG=./gateway-clawdbot.json \
OPENAI_API_KEY=sk-... \
bun run gateway
```

Uses environment variable for OpenAI API key.

## Files Modified

1. [src/gateway/config.ts](src/gateway/config.ts) - Added `botName` field to config schema
2. [src/gateway/gateway.ts](src/gateway/gateway.ts) - Added prefix filtering and bot name in replies

## Need Help?

If you have issues:
1. Check `~/.dexter/gateway-debug.log` for detailed logs
2. Verify your gateway config with: `cat ~/.dexter/gateway.json`
3. Ensure both bots are running with different config files
