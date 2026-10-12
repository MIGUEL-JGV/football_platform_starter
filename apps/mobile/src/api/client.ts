import { getApiBaseUrl } from '../config';

export class ApiError extends Error {
  statusCode: number;
  code: string;
  errors?: string[];

  constructor(message: string, statusCode: number, code: string, errors?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${getApiBaseUrl()}/api/v1${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const payload = data as { message?: string; code?: string; errors?: string[] } | null;
    throw new ApiError(
      payload?.message ?? `Error de red (${response.status})`,
      response.status,
      payload?.code ?? 'ERROR',
      payload?.errors,
    );
  }

  return data as T;
}