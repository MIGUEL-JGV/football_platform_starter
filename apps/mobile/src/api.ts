import { getApiBaseUrl } from './config';

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  database: string;
  timestamp: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const url = `${getApiBaseUrl()}/api/v1/health`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json() as Promise<HealthResponse>;
}