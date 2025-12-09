module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            // Temporarily disabled due to react-native-worklets dependency issues
            // 'react-native-reanimated/plugin',
        ],
    };
};
