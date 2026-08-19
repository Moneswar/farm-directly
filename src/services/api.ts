const API_BASE = '/api';

// Role-specific token keys so switching portals doesn't erase each other's sessions
const TOKEN_KEY = 'farmdirect_token';

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text || `HTTP ${response.status} ${response.statusText}` };
      }
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMsg =
      data?.message ||
      data?.error ||
      (typeof data === 'string' && data) ||
      `Request failed with HTTP status ${response.status} (${response.statusText || 'Server Error'})`;
    throw new Error(errorMsg);
  }

  if (data === null || data === undefined) {
    return {} as T;
  }

  return data as T;
}

