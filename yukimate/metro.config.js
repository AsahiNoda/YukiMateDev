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
    ws: path.resolve(__dirname, 'shims', 'ws'),
  },
  // Add 'svg' to source extensions and ensure platform-specific extensions are resolved first
  sourceExts: process.env.RN_SRC_EXT
    ? [...process.env.RN_SRC_EXT.split(',').concat(defaultSourceExts), 'svg']
    : [...defaultSourceExts, 'svg'],
  // Remove 'svg' from asset extensions
  assetExts: defaultAssetExts.filter(ext => ext !== 'svg'),
  // Custom resolver to force 'ws' to use our shim
  resolveRequest: (context, moduleName, platform) => {
    // Intercept any 'ws' module resolution and redirect to our shim
    if (moduleName === 'ws') {
      return {
        filePath: path.resolve(__dirname, 'shims', 'ws', 'index.js'),
        type: 'sourceFile',
      };
    }
    // Let Metro handle all other modules normally
    return context.resolveRequest(context, moduleName, platform);
  },
};

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

module.exports = config;
