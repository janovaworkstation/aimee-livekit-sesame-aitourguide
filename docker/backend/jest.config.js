/** @type {import('ts-jest').JestConfigWithTsJest} */

// Generate timestamp for report filename
const now = new Date();
const timestamp = now.toISOString()
  .replace(/[:.]/g, '-')
  .replace('T', '_')
  .slice(0, 19);

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/__tests__/**',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 10000,
  // Setup file for environment variables
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  // HTML test report
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'AImee Test Report',
      outputPath: `./test-reports/test-report_${timestamp}.html`,
      includeFailureMsg: true,
      includeSuiteFailure: true,
      dateFormat: 'yyyy-mm-dd HH:MM:ss'
    }]
  ]
};
