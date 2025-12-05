/** @type {import('ts-jest').JestConfigWithTsJest} */

const fs = require('fs');
const path = require('path');

// Function to get or create test run folder
function getTestRunFolder() {
  // Check if we're in a test run context with a shared folder
  const testRunFolder = process.env.TEST_RUN_FOLDER;
  if (testRunFolder) {
    return testRunFolder;
  }

  // Otherwise create a new timestamped folder for individual runs
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);

  const folder = path.join(__dirname, 'test-reports', `test-run_${timestamp}`);
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
  return folder;
}

// Function to generate report filename
function getReportFilename(testSuiteName) {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);

  const folder = getTestRunFolder();
  return path.join(folder, `${testSuiteName}_${timestamp}.html`);
}

// Base configuration that all test configs will extend
const baseConfig = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/__tests__/**',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 60000, // Increased for LLM tests
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
};

module.exports = {
  baseConfig,
  getReportFilename,
  getTestRunFolder
};