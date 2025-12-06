/** @type {import('ts-jest').JestConfigWithTsJest} */

const { baseConfig, getReportFilename } = require('./jest.config.base');

module.exports = {
  ...baseConfig,
  displayName: 'AImee Personality Tests',
  testMatch: ['**/testing/__tests__/aimeePersonality.test.ts'],
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'AImee Personality Tests Report',
      outputPath: getReportFilename('aimee-personality-tests'),
      includeFailureMsg: true,
      includeSuiteFailure: true,
      includeConsoleLog: true,
      dateFormat: 'yyyy-mm-dd HH:MM:ss'
    }]
  ]
};