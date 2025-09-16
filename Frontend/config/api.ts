import Constants from 'expo-constants';

type Extra = { BASE_URL?: string };
export const getBaseUrl = () => {
  const { BASE_URL } = (Constants.expoConfig?.extra ?? {}) as Extra;
  return BASE_URL ?? 'https://staygenie-wwpa.onrender.com';
};
