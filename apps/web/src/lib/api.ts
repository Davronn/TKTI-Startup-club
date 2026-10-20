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

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const response = await fetch(`/api/backend${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    const refreshed = await fetch('/api/backend/auth/refresh', {
      method: 'POST',
      credentials: 'include',
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
