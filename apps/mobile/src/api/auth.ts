import { apiRequest } from './client';

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  status: string;
}

export interface AuthResponse {
  accessToken: string;
  user: PublicUser;
}

export function loginRequest(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function registerRequest(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: { email, password, displayName },
  });
}

export function getMeRequest(token: string): Promise<PublicUser> {
  return apiRequest<PublicUser>('/auth/me', { token });
}