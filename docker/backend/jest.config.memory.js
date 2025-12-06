/** @type {import('ts-jest').JestConfigWithTsJest} */

const { baseConfig, getReportFilename } = require('./jest.config.base');

module.exports = {
  ...baseConfig,
  displayName: 'AImee Memory Feature Tests',
  testMatch: ['**/testing/__tests__/aimeeMemory.test.ts'],
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'AImee Memory Feature Tests Report',
      outputPath: getReportFilename('aimee-memory-tests'),
      includeFailureMsg: true,
      includeSuiteFailure: true,
      includeConsoleLog: true,
      dateFormat: 'yyyy-mm-dd HH:MM:ss'
    }]
  ]
};