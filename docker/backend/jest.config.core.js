/** @type {import('ts-jest').JestConfigWithTsJest} */

const { baseConfig, getReportFilename } = require('./jest.config.base');

module.exports = {
  ...baseConfig,
  displayName: 'AImee Core Feature Tests',
  testMatch: ['**/testing/__tests__/aimeeCoreFeature.test.ts'],
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'AImee Core Feature Tests Report',
      outputPath: getReportFilename('aimee-core-feature-tests'),
      includeFailureMsg: true,
      includeSuiteFailure: true,
      includeConsoleLog: true,
      dateFormat: 'yyyy-mm-dd HH:MM:ss'
    }]
  ]
};