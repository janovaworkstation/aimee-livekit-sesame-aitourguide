/** @type {import('ts-jest').JestConfigWithTsJest} */

const { baseConfig, getReportFilename } = require('./jest.config.base');

module.exports = {
  ...baseConfig,
  displayName: 'Unit Tests',
  testMatch: [
    '**/agents/__tests__/**/*.test.ts',
    '**/brain/__tests__/**/*.test.ts',
    '**/memory/__tests__/**/*.test.ts',
    '**/testing/__tests__/criticalPaths.test.ts' // Include static assertions
  ],
  testPathIgnorePatterns: [
    'aimeeCoreFeature.test.ts',
    'aimeePersonality.test.ts'
  ],
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'AImee Unit Tests Report',
      outputPath: getReportFilename('unit-tests'),
      includeFailureMsg: true,
      includeSuiteFailure: true,
      dateFormat: 'yyyy-mm-dd HH:MM:ss'
    }]
  ]
};