// frontend/src/services/api.ts

// URL can be replaced with env var later (e.g. import.meta.env.VITE_API_URL)
const API_BASE_URL = 'http://localhost:3000';

export interface ApiErrorResponse {
  error: string;
  message: string;
  ok: false;
}

export class ApiError extends Error {
  public code: string;
  public status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Automatically set JSON headers if sending data
  const headers = new Headers(options.headers);
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject auth token from storage if available
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error('Failed to parse server response (invalid JSON format).');
  }

  if (!response.ok || (data && data.ok === false)) {
    // Default error handling from Hono API
    const errorCode = data.error || 'UNKNOWN_ERROR';
    const errorMessage = data.message || 'An unknown server error occurred.';
    throw new ApiError(errorMessage, errorCode, response.status);
  }

  // Extract payload if wrapped in { data: ... }
  if (data && data.data !== undefined) {
    return data.data;
  }
  
  return data;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body: any, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: any, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: any, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'DELETE' }),
};
