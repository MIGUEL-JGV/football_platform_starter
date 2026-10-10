export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null>;
}

export function createApiClient(options: ApiClientOptions) {
  return {
    async get<T>(path: string): Promise<T> {
      const token = await options.getAccessToken?.();
      const response = await fetch(`${options.baseUrl}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      return response.json() as Promise<T>;
    },
  };
}
