// Client-side auth utilities
const TOKEN_KEY = "msme_pro_token";
const ORG_KEY = "msme_pro_org";
const USER_KEY = "msme_pro_user";
const ROLE_KEY = "msme_pro_role";

let cachedToken: string | null = null;

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  if (cachedToken) return cachedToken;
  const t = localStorage.getItem(TOKEN_KEY);
  cachedToken = t;
  return t;
}

export async function setToken(token: string | null): Promise<void> {
  cachedToken = token;
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function getStoredOrg<T = any>(): Promise<T | null> {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(ORG_KEY);
  return v ? JSON.parse(v) : null;
}

export async function setStoredOrg(org: any): Promise<void> {
  if (typeof window === "undefined") return;
  if (org) localStorage.setItem(ORG_KEY, JSON.stringify(org));
  else localStorage.removeItem(ORG_KEY);
}

export function getOrg(): any {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(ORG_KEY);
  return v ? JSON.parse(v) : null;
}

export function setOrg(org: any) {
  if (typeof window === "undefined") return;
  if (org) localStorage.setItem(ORG_KEY, JSON.stringify(org));
  else localStorage.removeItem(ORG_KEY);
}

export function getUser(): any {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(USER_KEY);
  return v ? JSON.parse(v) : null;
}

export function setUser(user: any) {
  if (typeof window === "undefined") return;
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!getToken();
}

export function hasOrg(): boolean {
  if (typeof window === "undefined") return false;
  const org = localStorage.getItem(ORG_KEY);
  return !!org;
}

export async function logout(): Promise<void> {
  await setToken(null);
  await setStoredOrg(null);
  if (typeof window !== "undefined") localStorage.removeItem(USER_KEY);
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  auth?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const url = new URL(`${baseUrl}/api${path}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const auth = opts.auth !== false;
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const resp = await fetch(url.toString(), {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await resp.text();
  const data = text ? safeJson(text) : null;
  if (!resp.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : null) ?? `HTTP ${resp.status}`;
    throw new ApiError(message, resp.status, data);
  }
  return data as T;
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

// Aliases for compatibility with @workspace/api-client-react patterns
export { setToken as setAuthToken };
export { getUser as getCurrentUser };
export { getOrg as getCurrentOrg };
export { setOrg as setCurrentOrg };
export { getToken as getAuthToken };
export { logout as clearAuth };

export function setCurrentRole(role: string | null): void {
  if (typeof window === "undefined") return;
  if (role) localStorage.setItem(ROLE_KEY, role);
  else localStorage.removeItem(ROLE_KEY);
}

export function getCurrentRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ROLE_KEY);
}