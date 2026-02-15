# Rollback Guide: Restore Both Bots Talking

This guide shows you how to rollback the bot prefix filtering so both bots respond to **all messages** (the old behavior).

## Quick Rollback Options

### Option 1: Remove botName from Config (Easiest)

Simply remove or comment out the `botName` field from your gateway config:

**Edit `~/.dexter/gateway.json`:**
```json
{
  "gateway": {
    "accountId": "default",
    // "botName": "dexter",  ← Comment out or remove this line
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

**Or remove the field entirely:**
```json
{
  "gateway": {
    "accountId": "default",
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

Then restart both bot instances:
```bash
# Restart Dexter
bun run gateway

# Restart clawdbot (in another terminal)
bun run gateway
```

**Result**: Both bots will respond to every message (old behavior restored).

---

## Option 2: Revert Code Changes (Full Rollback)

If you want to completely remove the prefix filtering code:

### Step 1: Revert gateway.ts

Replace the modified `handleInbound` function with the original version:

**File: [src/gateway/gateway.ts](src/gateway/gateway.ts#L46-L72)**

**Current (with filtering):**
```typescript
async function handleInbound(cfg: GatewayConfig, inbound: WhatsAppInboundMessage): Promise<void> {
  const bodyPreview = elide(inbound.body.replace(/\n/g, ' '), 50);
  console.log(`Inbound message ${inbound.from} (${inbound.chatType}, ${inbound.body.length} chars): "${bodyPreview}"`);
  debugLog(`[gateway] handleInbound from=${inbound.from} body="${inbound.body.slice(0, 30)}..."`);

  // Check for bot prefix in message (e.g., "@dexter" or "@clawdbot")
  const configuredBotName = cfg.gateway.botName?.toLowerCase().trim();
  const prefixMatch = inbound.body.match(/^@(\w+)\s+/);
  const messageBotPrefix = prefixMatch?.[1]?.toLowerCase();

  // If a prefix is present, check if it matches our bot name
  if (messageBotPrefix && configuredBotName && messageBotPrefix !== configuredBotName) {
    debugLog(`[gateway] skipping message - prefix '@${messageBotPrefix}' doesn't match bot '${configuredBotName}'`);
    console.log(`Skipping message - directed at @${messageBotPrefix}, not @${configuredBotName}`);
    return;
  }

  // Strip the bot prefix from the message if present
  const processedBody = prefixMatch ? inbound.body.slice(prefixMatch[0].length) : inbound.body;
  debugLog(`[gateway] processed body="${processedBody.slice(0, 30)}..." (prefix stripped: ${!!prefixMatch})`);

  const route = resolveRoute({
    cfg,
    channel: 'whatsapp',
    accountId: inbound.accountId,
    peer: { kind: inbound.chatType, id: inbound.senderId },
  });
```

**Rollback to (original):**
```typescript
async function handleInbound(cfg: GatewayConfig, inbound: WhatsAppInboundMessage): Promise<void> {
  const bodyPreview = elide(inbound.body.replace(/\n/g, ' '), 50);
  console.log(`Inbound message ${inbound.from} (${inbound.chatType}, ${inbound.body.length} chars): "${bodyPreview}"`);
  debugLog(`[gateway] handleInbound from=${inbound.from} body="${inbound.body.slice(0, 30)}..."`);

  const route = resolveRoute({
    cfg,
    channel: 'whatsapp',
    accountId: inbound.accountId,
    peer: { kind: inbound.chatType, id: inbound.senderId },
  });
```

### Step 2: Revert runAgentForMessage call

**Current (line 101-106):**
```typescript
const answer = await runAgentForMessage({
  sessionKey: route.sessionKey,
  query: processedBody,  // ← Uses processed body
  model: 'gpt-5.2',
  modelProvider: 'openai',
});
```

**Rollback to:**
```typescript
const answer = await runAgentForMessage({
  sessionKey: route.sessionKey,
  query: inbound.body,  // ← Uses original body
  model: 'gpt-5.2',
  modelProvider: 'openai',
});
```

### Step 3: Revert reply label

**Current (line 116-120):**
```typescript
const cleanedAnswer = cleanMarkdownForWhatsApp(answer);
const botLabel = cfg.gateway.botName || 'Dexter';  // ← Dynamic label
debugLog(`[gateway] sending reply to ${inbound.replyToJid}`);
await sendMessageWhatsApp({
  to: inbound.replyToJid,
  body: `[${botLabel}] ${cleanedAnswer}`,
  accountId: inbound.accountId,
});
```

**Rollback to:**
```typescript
const cleanedAnswer = cleanMarkdownForWhatsApp(answer);
debugLog(`[gateway] sending reply to ${inbound.replyToJid}`);
await sendMessageWhatsApp({
  to: inbound.replyToJid,
  body: `[Dexter] ${cleanedAnswer}`,  // ← Hardcoded label
  accountId: inbound.accountId,
});
```

### Step 4: (Optional) Revert config.ts

If you want to remove the `botName` field entirely:

**File: [src/gateway/config.ts](src/gateway/config.ts)**

Remove `botName` from:
1. `GatewayConfigSchema` (line 33)
2. `GatewayConfig` type (line 68)
3. `loadGatewayConfig` function (line 126)

---

## Option 3: Git Revert (Cleanest)

If you've committed the changes to git:

```bash
# Find the commit that added bot filtering
git log --oneline --grep="bot\|prefix\|filtering"

# Or view recent commits
git log --oneline -10

# Revert the specific commit (replace COMMIT_HASH)
git revert COMMIT_HASH

# Or reset to before the changes (DANGEROUS - loses commits)
git reset --hard HEAD~1  # Goes back 1 commit
```

---

## Comparison: Before vs After Rollback

### Before Rollback (Prefix Filtering Active)

**Scenario**: Both Dexter and clawdbot running

**Message**: `Hello`
- Dexter: No response (no prefix)
- clawdbot: No response (no prefix)

**Message**: `@dexter hello`
- Dexter: ✅ `[Dexter] Hey! 👋`
- clawdbot: No response (wrong prefix)

**Message**: `@clawdbot hello`
- Dexter: No response (wrong prefix)
- clawdbot: ✅ `[clawdbot] Hey! 👋`

### After Rollback (Both Bots Respond)

**Scenario**: Both Dexter and clawdbot running

**Message**: `Hello`
- Dexter: ✅ `[Dexter] Hey! 👋`
- clawdbot: ✅ `[clawdbot] Hey! 👋`

**Message**: `@dexter hello`
- Dexter: ✅ `[Dexter] Hey! 👋` (still responds, sees "@dexter hello" as the query)
- clawdbot: ✅ `[clawdbot] Hey! 👋` (also responds, sees "@dexter hello" as the query)

---

## Recommended Approach

**For temporary rollback**: Use **Option 1** (remove `botName` from config)
- Quick and easy
- No code changes needed
- Can switch back anytime

**For permanent rollback**: Use **Option 3** (git revert)
- Clean history
- Preserves all previous work
- Easy to undo if needed

**Not recommended**: Manual code editing (Option 2)
- Error-prone
- Hard to maintain
- Better to use git

---

## Testing After Rollback

1. **Restart both bots**:
   ```bash
   # Terminal 1
   bun run gateway

   # Terminal 2
   cd /path/to/clawdbot
   bun run gateway
   ```

2. **Send test message**:
   ```
   hello
   ```

3. **Expected result**: Both bots respond immediately

4. **Verify logs**:
   ```bash
   tail -f ~/.dexter/gateway-debug.log
   ```

   Should NOT see lines like:
   ```
   skipping message - prefix '@...' doesn't match bot '...'
   ```

---

## Re-enabling Prefix Filtering Later

To switch back to prefix filtering:

### Option A: Re-add botName to config
```json
{
  "gateway": {
    "accountId": "default",
    "botName": "dexter",  ← Add this back
    "logLevel": "info"
  }
}
```

### Option B: Use git to restore
```bash
# If you used git revert earlier
git revert HEAD  # Reverts the revert (brings changes back)

# Or cherry-pick the original commit
git cherry-pick ORIGINAL_COMMIT_HASH
```

---

## Files to Backup Before Rollback

Just in case, backup these files:

```bash
# Create backup directory
mkdir -p ~/dexter-backup

# Backup modified files
cp src/gateway/gateway.ts ~/dexter-backup/
cp src/gateway/config.ts ~/dexter-backup/
cp ~/.dexter/gateway.json ~/dexter-backup/
cp gateway-dexter.json ~/dexter-backup/
cp gateway-clawdbot.json ~/dexter-backup/

echo "Backup complete! Files saved to ~/dexter-backup/"
```

To restore from backup:
```bash
cp ~/dexter-backup/gateway.ts src/gateway/
cp ~/dexter-backup/config.ts src/gateway/
cp ~/dexter-backup/gateway.json ~/.dexter/
```

---

## Need Help?

If something goes wrong during rollback:

1. Check the backup files in `~/dexter-backup/`
2. View git history: `git log --oneline --all`
3. Check current changes: `git diff`
4. View bot logs: `tail -100 ~/.dexter/gateway-debug.log`

## Summary

**Easiest rollback**: Remove `"botName": "dexter"` from `~/.dexter/gateway.json` and restart bots.

**Result**: Both bots will respond to all messages, just like before! 🎉
