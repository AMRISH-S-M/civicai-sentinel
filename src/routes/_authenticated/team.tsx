import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader, Panel } from "@/components/sentinel/ui";
import { Button } from "@/components/ui/button";
import { useAuth, type Role } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team Access — CivicAI Sentinel" },
      { name: "description", content: "Admins grant or remove admin and field crew access." },
      { property: "og:title", content: "Team Access — CivicAI Sentinel" },
      { property: "og:description", content: "Manage staff roles for CivicAI Sentinel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Team,
});

interface Member { id: string; email: string | null; display_name: string | null; roles: Role[] }

function Team() {
  const { isAdmin, user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    const [p, r] = await Promise.all([supabase.from("profiles").select("id,email,display_name").order("created_at"), supabase.from("user_roles").select("user_id,role")]);
    if (p.error || r.error) return setErr("Couldn't load the team.");
    setMembers((p.data ?? []).map((m) => ({ ...m, roles: (r.data ?? []).filter((x) => x.user_id === m.id).map((x) => x.role as Role) })));
  }, []);
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load]);

  async function toggle(m: Member, role: Role) {
    setErr(null);
    const has = m.roles.includes(role);
    if (has && role === "admin" && m.id === user?.id) return setErr("You can't remove your own admin access.");
    const { error } = has
      ? await supabase.from("user_roles").delete().eq("user_id", m.id).eq("role", role)
      : await supabase.from("user_roles").insert({ user_id: m.id, role });
    if (error) setErr("Change not saved."); else void load();
  }

  return (
    <div className="min-h-screen"><AppHeader />
      <main className="mx-auto max-w-4xl space-y-4 px-5 py-6">
        <div><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Admin</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Team access</h1>
          <p className="text-sm text-muted-foreground">People appear here after they create an account on the sign-in page. Give them crew or admin access.</p></div>
        {!isAdmin ? <p className="text-sm text-muted-foreground">Only admins can manage team access.</p> : (
          <Panel title="Accounts">
            {err && <p role="alert" className="mb-2 text-sm text-destructive">{err}</p>}
            <div className="divide-y divide-border">
              {members.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0"><div className="font-medium">{m.display_name || "—"}</div><div className="truncate text-xs text-muted-foreground">{m.email}</div></div>
                  <div className="flex gap-2">
                    {(["crew", "admin"] as const).map((role) => (
                      <Button key={role} size="sm" variant={m.roles.includes(role) ? "default" : "outline"} aria-pressed={m.roles.includes(role)} onClick={() => void toggle(m, role)}>
                        {role === "crew" ? "Field crew" : "Admin"}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </main>
    </div>
  );
}
