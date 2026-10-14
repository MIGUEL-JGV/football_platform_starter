let currentToken: string | null = null;

export function setAuthorizationToken(token: string | null): void {
  currentToken = token && token.length > 0 ? token : null;
}

export function getAuthorizationToken(): string | null {
  return currentToken;
}

export function extractAuthorizationToken(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const marker = '/authorize/';
  const index = value.indexOf(marker);
  const token = index >= 0 ? value.slice(index + marker.length) : value;
  const clean = token.split(/[?#/]/)[0].trim();
  return clean.length > 0 ? clean : null;
}
