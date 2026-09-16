// getSentryExpoConfig no lugar do getDefaultConfig: injeta um debug ID em cada
// bundle, que é como o Sentry casa o erro com o source map enviado (inclusive
// nos bundles de EAS Update). NativeWind continua embrulhando por cima.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
