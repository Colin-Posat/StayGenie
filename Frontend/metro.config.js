const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Ignore Apple Auth on non-iOS platforms
  if (
    moduleName === '@invertase/react-native-apple-authentication' &&
    platform !== 'ios'
  ) {
    return {
      type: 'empty',
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;