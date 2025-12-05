/** @type {import('ts-jest').JestConfigWithTsJest} */

const { baseConfig, getReportFilename } = require('./jest.config.base');

module.exports = {
  ...baseConfig,
  displayName: 'LLM-as-Judge Tests',
  testMatch: ['**/testing/__tests__/criticalPaths.test.ts'],
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'AImee LLM-as-Judge Tests Report',
      outputPath: getReportFilename('llm-as-judge-tests'),
      includeFailureMsg: true,
      includeSuiteFailure: true,
      dateFormat: 'yyyy-mm-dd HH:MM:ss'
    }]
  ]
};