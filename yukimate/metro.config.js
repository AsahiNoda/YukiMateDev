const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Get the default source and asset extensions
const defaultSourceExts = config.resolver.sourceExts || [];
const defaultAssetExts = config.resolver.assetExts || [];

config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...(config.resolver && config.resolver.extraNodeModules
      ? config.resolver.extraNodeModules
      : {}),
    ws: path.resolve(__dirname, 'shims', 'ws.js'),
  },
  // Add 'svg' to source extensions
  sourceExts: [...defaultSourceExts, 'svg'],
  // Remove 'svg' from asset extensions
  assetExts: defaultAssetExts.filter(ext => ext !== 'svg'),
};

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

module.exports = config;
