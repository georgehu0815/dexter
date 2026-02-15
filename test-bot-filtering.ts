#!/usr/bin/env bun
/**
 * Test script to verify bot prefix filtering works correctly
 * Run with: bun run test-bot-filtering.ts
 */

import { loadGatewayConfig } from './src/gateway/config.js';

console.log('Testing bot prefix filtering logic...\n');

// Simulate the filtering logic from gateway.ts
function testMessage(botName: string | undefined, messageBody: string): { shouldProcess: boolean; processedBody: string } {
  const configuredBotName = botName?.toLowerCase().trim();
  const prefixMatch = messageBody.match(/^@(\w+)\s+/);
  const messageBotPrefix = prefixMatch?.[1]?.toLowerCase();

  // If a prefix is present, check if it matches our bot name
  if (messageBotPrefix && configuredBotName && messageBotPrefix !== configuredBotName) {
    return { shouldProcess: false, processedBody: messageBody };
  }

  // Strip the bot prefix from the message if present
  const processedBody = prefixMatch ? messageBody.slice(prefixMatch[0].length) : messageBody;
  return { shouldProcess: true, processedBody };
}

// Test cases
const testCases = [
  { botName: 'dexter', message: '@dexter hello', expected: true },
  { botName: 'dexter', message: '@clawdbot hello', expected: false },
  { botName: 'dexter', message: 'hello', expected: true },
  { botName: 'clawdbot', message: '@clawdbot hello', expected: true },
  { botName: 'clawdbot', message: '@dexter hello', expected: false },
  { botName: 'clawdbot', message: 'hello', expected: true },
  { botName: undefined, message: '@dexter hello', expected: true },
  { botName: undefined, message: '@clawdbot hello', expected: true },
  { botName: undefined, message: 'hello', expected: true },
];

console.log('Running test cases...\n');
let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = testMessage(test.botName, test.message);
  const success = result.shouldProcess === test.expected;

  if (success) {
    passed++;
    console.log(`✅ PASS: botName="${test.botName || 'none'}" message="${test.message}"`);
    console.log(`   → Should process: ${result.shouldProcess}, Processed: "${result.processedBody}"\n`);
  } else {
    failed++;
    console.log(`❌ FAIL: botName="${test.botName || 'none'}" message="${test.message}"`);
    console.log(`   → Expected: ${test.expected}, Got: ${result.shouldProcess}\n`);
  }
}

console.log(`\nTest Results: ${passed} passed, ${failed} failed\n`);

// Load and display current config
console.log('Current gateway configuration:');
try {
  const cfg = loadGatewayConfig();
  console.log(`  Bot Name: ${cfg.gateway.botName || '(not set)'}`);
  console.log(`  Account ID: ${cfg.gateway.accountId}`);
  console.log(`  Log Level: ${cfg.gateway.logLevel}`);
} catch (err) {
  console.error(`  Error loading config: ${err}`);
}

process.exit(failed > 0 ? 1 : 0);
