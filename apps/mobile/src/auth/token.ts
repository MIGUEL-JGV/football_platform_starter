import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'cancha.accessToken';
const AUTHORIZATION_KEY = 'cancha.authorizationToken';

let cachedToken: string | null = null;
let cachedAuthorization: string | null = null;

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

export async function loadAuthorizationToken(): Promise<string | null> {
  if (cachedAuthorization) return cachedAuthorization;
  cachedAuthorization = await AsyncStorage.getItem(AUTHORIZATION_KEY);
  return cachedAuthorization;
}

export async function saveAuthorizationToken(token: string): Promise<void> {
  cachedAuthorization = token;
  await AsyncStorage.setItem(AUTHORIZATION_KEY, token);
}

export async function clearAuthorizationToken(): Promise<void> {
  cachedAuthorization = null;
  await AsyncStorage.removeItem(AUTHORIZATION_KEY);
}