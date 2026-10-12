import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'cancha.accessToken';

let cachedToken: string | null = null;

export function getCachedToken(): string | null {
  return cachedToken;
}

export async function loadToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  return cachedToken;
}

export async function saveToken(token: string): Promise<void> {
  cachedToken = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  cachedToken = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
}