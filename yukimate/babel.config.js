module.exports = function (api) {
    // NODE_ENV ごとにキャッシュを分ける（dev と production で設定が異なるため）
    const isProduction = api.cache.using(
        () => process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production'
    );

    const plugins = [];

    // 本番ビルドでは console.log / info / debug を除去（error / warn は残す）
    // ログ出力はJSスレッドで文字列化・ブリッジ転送が発生し、本番でも動作を重くするため
    if (isProduction) {
        plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
    }

    // reanimated プラグインは必ず最後に置く
    plugins.push('react-native-reanimated/plugin');

    return {
        presets: ['babel-preset-expo'],
        plugins,
    };
};
