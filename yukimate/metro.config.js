const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// React Native用のポリフィル設定（Supabaseのrealtime機能用）
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...(config.resolver.extraNodeModules || {}),
    events: require.resolve('events'),
    ws: require.resolve('isomorphic-ws'),
    stream: require.resolve('stream-browserify'),
    http: require.resolve('stream-http'),
    crypto: require.resolve('react-native-crypto'),
    https: require.resolve('https-browserify'),
    // net and tls are not needed for basic Supabase operations (REST API only)
    // Only needed if using realtime subscriptions
    net: require.resolve('react-native-tcp-socket'),
    tls: require.resolve('react-native-tcp-socket'),
  },
  // Resolve extensions for better compatibility
  sourceExts: [...(config.resolver.sourceExts || []), 'cjs'],
};

// Make SVG transformer optional: if it's not installed, skip configuring it
try {
  const transformerPath = require.resolve('react-native-svg-transformer');
  config.transformer = {
    ...config.transformer,
    babelTransformerPath: transformerPath,
  };
  config.resolver = {
    ...config.resolver,
    assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...config.resolver.sourceExts, 'svg'],
  };
} catch (_e) {
  // react-native-svg-transformer not installed; use default config
}

module.exports = config;
