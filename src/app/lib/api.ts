// Lightweight fetch wrapper that:
//   * prepends VITE_API_BASE
//   * attaches the auth token from localStorage to every request
//   * parses JSON & throws Errors for non-2xx responses

const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const TOKEN_KEY = 'cinemahub_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  status: number;
  detail: any;
  constructor(status: number, detail: any) {
    let msg = 'Request failed';
    if (typeof detail === 'string') {
      msg = detail;
    } else if (detail && detail.detail) {
      if (Array.isArray(detail.detail)) {
        msg = detail.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
      } else if (typeof detail.detail === 'string') {
        msg = detail.detail;
      } else {
        msg = JSON.stringify(detail.detail);
      }
    } else if (detail && detail.message) {
      msg = detail.message;
    }
    super(msg);
    this.status = status;
    this.detail = detail;
  }
}

interface RequestOpts extends Omit<RequestInit, 'body'> {
  body?: any;
  auth?: boolean; // default true if a token exists
}

export async function api<T = any>(path: string, opts: RequestOpts = {}): Promise<T> {
  const headers = new Headers(opts.headers || {});
  const token = tokenStore.get();

  const sendAuth = opts.auth !== false && !!token;
  if (sendAuth) headers.set('Authorization', `Bearer ${token}`);

  let body: BodyInit | undefined = undefined;
  if (opts.body !== undefined) {
    if (opts.body instanceof FormData || typeof opts.body === 'string') {
      body = opts.body;
    } else {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(opts.body);
    }
  }

  const res = await fetch(`${BASE}${path}`, { ...opts, headers, body });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

// Convenience methods
export const apiGet  = <T = any>(p: string, opts?: RequestOpts) => api<T>(p, { ...opts, method: 'GET' });
export const apiPost = <T = any>(p: string, body?: any, opts?: RequestOpts) => api<T>(p, { ...opts, method: 'POST', body });
export const apiPut  = <T = any>(p: string, body?: any, opts?: RequestOpts) => api<T>(p, { ...opts, method: 'PUT', body });
export const apiDel  = <T = any>(p: string, opts?: RequestOpts) => api<T>(p, { ...opts, method: 'DELETE' });
