// Jest test setup
import dotenv from 'dotenv';
import os from 'os';
import path from 'path';

// Load .env file for LLM tests (when running with test:llm)
// This must happen before we potentially override with test-api-key
if (process.env.RUN_LLM_TESTS === 'true') {
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
} else {
  // For regular unit tests, use fake API key to skip LLM calls
  process.env.OPENAI_API_KEY = 'test-api-key';
}

process.env.NODE_ENV = 'test';

// Use temp directory for test files

const testDir = path.join(os.tmpdir(), 'aimee-tests-' + Date.now());
process.env.MEMORY_FILE_PATH = path.join(testDir, 'memory.json');
process.env.TRANSCRIPT_FILE_PATH = path.join(testDir, 'transcripts.json');

// Clean up test files after all tests
afterAll(() => {
  const fs = require('fs');
  try {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  } catch (e) {
    // Ignore cleanup errors
  }
});
