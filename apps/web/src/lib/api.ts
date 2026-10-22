export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function parseResponse(response: Response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : response.text();
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
let csrfPromise: Promise<string> | null = null;

function readCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const row = document.cookie.split('; ').find((item) => item.startsWith(prefix));
  return row ? decodeURIComponent(row.slice(prefix.length)) : null;
}

async function csrfToken() {
  const existing = readCookie('__Host-csrf_token') || readCookie('csrf_token');
  if (existing) return existing;
  if (!csrfPromise) {
    csrfPromise = fetch('/api/backend/auth/csrf', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new ApiError('Xavfsizlik tokenini olib bo‘lmadi', response.status);
        const data = await response.json() as { csrfToken: string };
        return data.csrfToken;
      })
      .finally(() => { csrfPromise = null; });
  }
  return csrfPromise;
}

async function requestHeaders(init: RequestInit) {
  const method = (init.method || 'GET').toUpperCase();
  const token = SAFE_METHODS.has(method) ? null : await csrfToken();
  return {
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { 'X-CSRF-Token': token } : {}),
    ...init.headers,
  };
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = await requestHeaders(init);
  const response = await fetch(`/api/backend${path}`, {
    ...init,
    credentials: 'include',
    cache: init.cache || 'no-store',
    headers,
  });

  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    const refreshed = await fetch('/api/backend/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: await requestHeaders({ method: 'POST' }),
    });
    if (refreshed.ok) return apiFetch<T>(path, init, false);
  }

  const data = await parseResponse(response);
  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'message' in data
        ? Array.isArray((data as any).message)
          ? (data as any).message.join(', ')
          : (data as any).message
        : 'So‘rovni bajarib bo‘lmadi';
    throw new ApiError(message, response.status, data);
  }
  return data as T;
}

export function toQuery(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const result = search.toString();
  return result ? `?${result}` : '';
}
