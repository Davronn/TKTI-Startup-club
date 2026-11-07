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
    // FormData (fayl yuklash) uchun Content-Type'ni brauzer o‘zi boundary bilan qo‘yadi
    ...(typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { 'X-CSRF-Token': token } : {}),
    ...init.headers,
  };
}

const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/csrf'];

// Bir vaqtda bir nechta so‘rov 401 olsa, faqat bitta refresh yuboriladi
let refreshPromise: Promise<boolean> | null = null;

function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch('/api/backend/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: await requestHeaders({ method: 'POST' }),
      });
      return response.ok;
    })()
      .catch(() => false)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
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

  // /auth/me ham refresh qilinadi: aks holda 15 daqiqadan keyin sahifa yangilansa sessiya yo‘qoladi
  if (response.status === 401 && retry && !NO_REFRESH_PATHS.some((prefix) => path.startsWith(prefix))) {
    if (await refreshSession()) return apiFetch<T>(path, init, false);
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

/** Fayl yuklab olish (Excel/Word/CSV): sessiya tugagan bo‘lsa bir marta yangilaydi. */
export async function apiDownload(path: string, fallbackName: string) {
  let response = await fetch(`/api/backend${path}`, { credentials: 'include', cache: 'no-store' });
  if (response.status === 401 && (await refreshSession())) {
    response = await fetch(`/api/backend${path}`, { credentials: 'include', cache: 'no-store' });
  }
  if (!response.ok) {
    const data = await parseResponse(response).catch(() => null);
    const message =
      typeof data === 'object' && data && 'message' in data
        ? String(Array.isArray((data as any).message) ? (data as any).message.join(', ') : (data as any).message)
        : 'Faylni tayyorlab bo‘lmadi';
    throw new ApiError(message, response.status, data);
  }
  const disposition = response.headers.get('content-disposition') || '';
  const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] || fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
