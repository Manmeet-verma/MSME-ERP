import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getStoredOrg, getStoredUser, loadToken, logout as apiLogout, setStoredOrg, setStoredUser, setToken } from "./api";

export interface OrgSummary {
  id: number;
  name: string;
  slug: string;
  role: "owner" | "admin" | "sales" | "viewer";
}
export interface User {
  id: number;
  email: string;
  name: string;
}
interface AuthResponse {
  token: string;
  user: User;
  activeOrgId: number | null;
  organizations: OrgSummary[];
}
interface AuthState {
  token: string | null;
  user: User | null;
  org: OrgSummary | null;
  organizations: OrgSummary[];
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchOrg: (orgId: number) => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTok] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<OrgSummary | null>(null);
  const [organizations, setOrgs] = useState<OrgSummary[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await loadToken();
      const u = await getStoredUser<User>();
      const o = await getStoredOrg<OrgSummary>();
      setTok(t);
      setUser(u);
      setOrg(o);
      setReady(true);
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const resp = await api<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    await setToken(resp.token);
    await setStoredUser(resp.user);
    const active = resp.organizations.find((o) => o.id === resp.activeOrgId) ?? resp.organizations[0] ?? null;
    if (active) await setStoredOrg(active);
    setTok(resp.token);
    setUser(resp.user);
    setOrg(active);
    setOrgs(resp.organizations);
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setTok(null);
    setUser(null);
    setOrg(null);
    setOrgs([]);
  }, []);

  const switchOrg = useCallback(async (orgId: number) => {
    const resp = await api<{ token: string; activeOrgId: number; role: OrgSummary["role"] }>(
      "/auth/switch-org",
      { method: "POST", body: { orgId } },
    );
    await setToken(resp.token);
    const next = organizations.find((o) => o.id === orgId) ?? null;
    if (next) {
      const updated = { ...next, role: resp.role };
      await setStoredOrg(updated);
      setOrg(updated);
    }
    setTok(resp.token);
  }, [organizations]);

  const value = useMemo<AuthState>(
    () => ({ token, user, org, organizations, ready, signIn, signOut, switchOrg }),
    [token, user, org, organizations, ready, signIn, signOut, switchOrg],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
