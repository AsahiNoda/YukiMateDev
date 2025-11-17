const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...(config.resolver || {}),
  extraNodeModules: {
    ...(config.resolver && config.resolver.extraNodeModules
      ? config.resolver.extraNodeModules
      : {}),
    ws: path.resolve(__dirname, 'shims', 'ws.js'),
  },
};

module.exports = config;
