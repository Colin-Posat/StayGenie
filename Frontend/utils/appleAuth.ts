import { Platform } from 'react-native';

let appleAuthModule: any = null;

// Only attempt to load on iOS - use function to prevent static analysis
const getAppleAuth = () => {
  if (Platform.OS === 'ios' && !appleAuthModule) {
    try {
      // Dynamic require that bundler won't statically analyze
      const modulePath = '@invertase/react-native-apple-authentication';
      appleAuthModule = require(modulePath).appleAuth;
    } catch (e) {
      console.warn('Apple Auth not available:', e);
    }
  }
  return appleAuthModule;
};

// Export a proxy object that lazily loads appleAuth
export const appleAuth = new Proxy({} as any, {
  get(target, prop) {
    const auth = getAppleAuth();
    if (auth && prop in auth) {
      return auth[prop];
    }
    return undefined;
  }
});