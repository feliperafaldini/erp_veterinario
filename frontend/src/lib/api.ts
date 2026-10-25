import type { ApiError } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

class HttpError extends Error {
  status: number;
  data: ApiError | null;
  constructor(status: number, data: ApiError | null, message: string) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function parseErrorBody(text: string): ApiError | null {
  try {
    return JSON.parse(text) as ApiError;
  } catch {
    return null;
  }
}

function buildMessage(data: ApiError | null, status: number): string {
  if (!data) return `Erro ${status}`;
  const msg = data.message;
  if (Array.isArray(msg)) return msg.join('. ');
  return msg;
}

async function refreshToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken: string };
    setAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  overrideToken?: string | null
): Promise<T> {
  const headers = new Headers(options.headers);
  const token = overrideToken !== undefined ? overrideToken : accessToken;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && !path.startsWith('/auth/')) {
    const newToken = await refreshToken();
    if (newToken) {
      const retryHeaders = new Headers(options.headers);
      retryHeaders.set('Authorization', `Bearer ${newToken}`);
      if (options.body && !(options.body instanceof FormData)) {
        retryHeaders.set('Content-Type', 'application/json');
      }
      const retryRes = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: retryHeaders,
        credentials: 'include',
      });
      if (retryRes.ok || retryRes.status === 204) {
        return retryRes.status === 204 ? (undefined as T) : ((await retryRes.json()) as T);
      }
      if (retryRes.status === 401) {
        onUnauthorized?.();
        throw new HttpError(401, null, 'Sessão expirada');
      }
      const text = await retryRes.text();
      const data = parseErrorBody(text);
      throw new HttpError(retryRes.status, data, buildMessage(data, retryRes.status));
    }
    onUnauthorized?.();
    throw new HttpError(401, null, 'Sessão expirada');
  }

  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    const data = parseErrorBody(text);
    throw new HttpError(res.status, data, buildMessage(data, res.status));
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown, token?: string | null) =>
    apiRequest<T>(
      path,
      { method: 'POST', body: body ? JSON.stringify(body) : undefined },
      token
    ),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
};

export { HttpError };
