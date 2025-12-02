const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure resolver to handle module resolution more gracefully
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.unstable_enablePackageExports = false;

module.exports = config;