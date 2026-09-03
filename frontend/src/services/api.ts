// frontend/src/services/api.ts

// Ten URL w przyszłości można podmienić na zmienną środowiskową np. import.meta.env.VITE_API_URL
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

  // Automatyczne ustawienie nagłówków JSON jeśli wysyłamy dane
  const headers = new Headers(options.headers);
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // W tym miejscu w przyszłości można dodawać token z localStorage/stanu
  const token = localStorage.getItem('token');
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
    throw new Error('Nie udało się przetworzyć odpowiedzi od serwera (format niezgodny z JSON).');
  }

  if (!response.ok || (data && data.ok === false)) {
    // Domyślne wartości z API Hono
    const errorCode = data.error || 'UNKNOWN_ERROR';
    const errorMessage = data.message || 'Wystąpił nieznany błąd serwera.';
    throw new ApiError(errorMessage, errorCode, response.status);
  }

  // Jeśli serwer zwrócił odp. ok, a dane są zapakowane w obiekt { data: ... }, rozpakuj je
  if (data && data.data !== undefined) {
    return data.data;
  }
  
  return data;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body: any, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: any, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'DELETE' }),
};
