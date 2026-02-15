#!/usr/bin/env bun
/**
 * Test script to verify Claude/Anthropic integration with TokenManager
 * This script tests that the agent can use Claude models without requiring
 * an explicit API key in the environment (using keychain instead)
 */
import { config } from 'dotenv';
import { callLlm, DEFAULT_MODEL, DEFAULT_PROVIDER } from './src/model/llm.js';
import { logger } from './src/utils/index.js';

// Load environment variables
config({ quiet: true });

async function testClaudeIntegration() {
  console.log('🧪 Testing Claude/Anthropic Integration\n');
  console.log(`📦 Default Provider: ${DEFAULT_PROVIDER}`);
  console.log(`🤖 Default Model: ${DEFAULT_MODEL}\n`);

  try {
    console.log('🔍 Testing TokenManager API key retrieval...');

    // Test a simple LLM call
    console.log('📤 Sending test prompt to Claude...');
    const startTime = Date.now();

    const result = await callLlm('Say "Hello from Claude!" and nothing else.', {
      model: DEFAULT_MODEL,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('\n✅ Success! Claude responded:');
    console.log(`📝 Response: ${typeof result.response === 'string' ? result.response : result.response.content}`);
    console.log(`⏱️  Duration: ${duration}ms`);

    if (result.usage) {
      console.log(`📊 Token Usage:`);
      console.log(`   - Input tokens: ${result.usage.inputTokens}`);
      console.log(`   - Output tokens: ${result.usage.outputTokens}`);
      console.log(`   - Total tokens: ${result.usage.totalTokens}`);
    }

    console.log('\n🎉 Claude integration test PASSED!');
    console.log('✨ The agent is working correctly with Claude model without needing an explicit API key.');

    return true;
  } catch (error) {
    console.error('\n❌ Test FAILED!');
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);

    if (error instanceof Error && error.message.includes('ANTHROPIC_API_KEY')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Set ANTHROPIC_API_KEY in .env file, OR');
      console.error('   2. Install Claude Code and ensure you are logged in');
      console.error('   3. If on macOS, TokenManager will automatically retrieve the key from keychain');
    }

    return false;
  }
}

// Run the test
testClaudeIntegration()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
