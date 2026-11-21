// Session + staff roles, shared by every screen. Roles come from public.user_roles
// (read through RLS); the database enforces access, this only drives the UI.
import { useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "crew";
export interface AuthState { ready: boolean; user: User | null; roles: Role[] }

let state: AuthState = { ready: false, user: null, roles: [] };
const listeners = new Set<() => void>();
const emit = (s: AuthState) => { state = s; listeners.forEach((l) => l()); };

export async function loadRoles(user: User | null): Promise<Role[]> {
  if (!user) return [];
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  return (data ?? []).map((r) => r.role as Role);
}

async function refresh() {
  const { data } = await supabase.auth.getUser();
  const user = data.user ?? null;
  emit({ ready: true, user, roles: await loadRoles(user) });
}

let started = false;
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  void refresh();
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void refresh();
  });
}

const serverState: AuthState = { ready: false, user: null, roles: [] };
export function useAuth() {
  const s = useSyncExternalStore((l) => { start(); listeners.add(l); return () => listeners.delete(l); }, () => state, () => serverState);
  return { ...s, isStaff: s.roles.length > 0, isAdmin: s.roles.includes("admin") };
}

export async function signOut() {
  await supabase.auth.signOut();
}
