const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  } | null;
}

export class ApiError extends Error {
  code?: string;
  details?: any;

  constructor(message: string, code?: string, details?: any) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('trustlayer_token') : null;
}

function resolveUrl(endpoint: string): string {
  // Prepend /api if endpoint doesn't start with /api or full URL
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return cleanEndpoint.startsWith('/api') ? cleanEndpoint : `${API_BASE}${cleanEndpoint}`;
}

function handleUnauthorized() {
  if (typeof window === 'undefined') return;
  // Clear token on unauthorized if not on auth page
  if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
    localStorage.removeItem('trustlayer_token');
    localStorage.removeItem('trustlayer_user');
    window.location.href = '/login';
  }
}

export async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const fullUrl = resolveUrl(endpoint);

  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers,
    });

    const json: ApiResponse<T> = await res.json();

    if (!res.ok || !json.success) {
      if (res.status === 401) {
        handleUnauthorized();
      }
      throw new ApiError(
        json.error?.message || `Request failed with status ${res.status}`,
        json.error?.code,
        json.error?.details
      );
    }

    return json.data;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error.message || 'Network error occurred');
  }
}

export interface DownloadResult {
  filename: string;
  rowCount: number | null;
  truncated: boolean;
}

// Fetches an authenticated file response and saves it via a temporary object URL
export async function downloadFile(endpoint: string, fallbackFilename: string): Promise<DownloadResult> {
  const token = getToken();
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  let res: Response;
  try {
    res = await fetch(resolveUrl(endpoint), { method: 'GET', headers });
  } catch (error: any) {
    throw new ApiError(error.message || 'Network error occurred');
  }

  if (!res.ok) {
    if (res.status === 401) {
      handleUnauthorized();
    }
    const json: ApiResponse | null = await res.json().catch(() => null);
    throw new ApiError(
      json?.error?.message || `Download failed with status ${res.status}`,
      json?.error?.code,
      json?.error?.details
    );
  }

  const disposition = res.headers.get('Content-Disposition') || '';
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] || fallbackFilename;
  const rowCountHeader = res.headers.get('X-Export-Row-Count');
  const truncated = res.headers.get('X-Export-Truncated') === 'true';

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke after the browser has started the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return {
    filename,
    rowCount: rowCountHeader !== null ? Number(rowCountHeader) : null,
    truncated,
  };
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
