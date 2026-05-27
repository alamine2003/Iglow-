import { API_BASE_URL } from '../config';

export async function apiFetch(path: string, token: string | null, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}

export async function fetchMe(token: string) {
  return apiJson<{
    uid: string;
    email: string;
    role: string;
    nom?: string;
    prenom?: string;
    phone?: string;
    claims_out_of_sync?: boolean;
  }>('/api/me/', token);
}

export async function apiJson<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, token, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

/** Envoi multipart (upload image produit, etc.). Ne pas definir Content-Type manuellement. */
export async function apiFormData<T>(
  path: string,
  token: string,
  formData: FormData,
  method: 'POST' | 'PATCH' = 'POST'
): Promise<T> {
  const res = await apiFetch(path, token, { method, body: formData });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
