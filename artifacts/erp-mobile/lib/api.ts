import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "msme_pro_token";
const ORG_KEY = "msme_pro_org";
const USER_KEY = "msme_pro_user";

let cachedToken: string | null = null;

export function getBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "";
}

export async function loadToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  const t = await AsyncStorage.getItem(TOKEN_KEY);
  cachedToken = t;
  return t;
}

export async function setToken(token: string | null): Promise<void> {
  cachedToken = token;
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function setStoredOrg(org: unknown): Promise<void> {
  if (org) await AsyncStorage.setItem(ORG_KEY, JSON.stringify(org));
  else await AsyncStorage.removeItem(ORG_KEY);
}
export async function getStoredOrg<T = unknown>(): Promise<T | null> {
  const v = await AsyncStorage.getItem(ORG_KEY);
  return v ? (JSON.parse(v) as T) : null;
}
export async function setStoredUser(user: unknown): Promise<void> {
  if (user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  else await AsyncStorage.removeItem(USER_KEY);
}
export async function getStoredUser<T = unknown>(): Promise<T | null> {
  const v = await AsyncStorage.getItem(USER_KEY);
  return v ? (JSON.parse(v) as T) : null;
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
  const url = new URL(`${getBaseUrl()}/api${path}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  const auth = opts.auth !== false;
  if (auth) {
    const t = await loadToken();
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

export async function logout(): Promise<void> {
  await setToken(null);
  await setStoredOrg(null);
  await setStoredUser(null);
}
