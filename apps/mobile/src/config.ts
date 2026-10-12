import { NativeModules, Platform } from 'react-native';

const API_PORT = 4000;

function hostFromScriptURL(): string | null {
  const scriptURL = NativeModules.SourceCode?.scriptURL as string | undefined;
  if (!scriptURL) return null;
  return scriptURL.split('://')[1]?.split(':')[0] ?? null;
}

export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const host = hostFromScriptURL();
  if (host) return `http://${host}:${API_PORT}`;

  const fallbackHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${fallbackHost}:${API_PORT}`;
}