import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import type { Organization, OrgSummary, User, MemberRole } from "@workspace/api-client-react";

export type CachedOrg = Organization | (OrgSummary & Partial<Organization>);

const API_BASE = import.meta.env.DEV
  ? ""
  : "https://msme-erp-api-3s11.onrender.com";

const TOKEN_KEY = "saas_token";
const USER_KEY = "saas_user";
const ORG_KEY = "saas_org";
const ROLE_KEY = "saas_role";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ORG_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function setCurrentUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getCurrentUser(): User | null {
  try {
    const v = localStorage.getItem(USER_KEY);
    return v ? (JSON.parse(v) as User) : null;
  } catch {
    return null;
  }
}

export function setCurrentOrg(org: CachedOrg | null) {
  if (org) localStorage.setItem(ORG_KEY, JSON.stringify(org));
  else localStorage.removeItem(ORG_KEY);
}

export function getCurrentOrg(): CachedOrg | null {
  try {
    const v = localStorage.getItem(ORG_KEY);
    return v ? (JSON.parse(v) as CachedOrg) : null;
  } catch {
    return null;
  }
}

export function setCurrentRole(role: MemberRole | null) {
  if (role) localStorage.setItem(ROLE_KEY, role);
  else localStorage.removeItem(ROLE_KEY);
}

export function getCurrentRole(): MemberRole | null {
  return (localStorage.getItem(ROLE_KEY) as MemberRole | null) ?? null;
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export function isAuthenticated(): boolean {
  const token = getAuthToken();
  if (!token) return false;
  if (isTokenExpired(token)) {
    clearAuth();
    return false;
  }
  return true;
}

export function hasOrg() {
  return !!getCurrentOrg();
}

setAuthTokenGetter(() => {
  const token = getAuthToken();
  if (token && isTokenExpired(token)) {
    clearAuth();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    return null;
  }
  return token;
});
setBaseUrl(API_BASE);
