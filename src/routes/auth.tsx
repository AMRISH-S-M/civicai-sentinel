import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader, Panel } from "@/components/sentinel/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

const safePath = (p: unknown) => {
  if (typeof p !== "string") return "/";
  try { const u = new URL(p, "http://x"); return u.origin === "http://x" && u.pathname !== "/auth" ? u.pathname + u.search : "/"; } catch { return "/"; }
};

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => (typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {}),
  head: () => ({
    meta: [
      { title: "Staff Sign In — CivicAI Sentinel" },
      { name: "description", content: "Sign in for municipal admins and field crews to manage civic issue reports." },
      { property: "og:title", content: "Staff Sign In — CivicAI Sentinel" },
      { property: "og:description", content: "Admin and field crew access to the CivicAI Sentinel command center." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { ready, user } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { if (ready && user) void navigate({ to: safePath(redirect) }); }, [ready, user, redirect, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const em = email.trim();
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: em, password });
        if (error) throw error;
      } else if (mode === "signup") {
        if (password.length < 8) throw new Error("Use at least 8 characters for the password.");
        const { data, error } = await supabase.auth.signUp({ email: em, password, options: { emailRedirectTo: window.location.origin + "/auth", data: { display_name: name.trim().slice(0, 80) } } });
        if (error) throw error;
        if (!data.session) setMsg({ ok: true, text: "Check your email and click the confirmation link, then sign in." });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(em, { redirectTo: window.location.origin + "/reset-password" });
        if (error) throw error;
        setMsg({ ok: true, text: "If that email has an account, a reset link is on its way." });
      }
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Something went wrong. Try again." });
    } finally { setBusy(false); }
  }

  const title = mode === "signin" ? "Staff sign in" : mode === "signup" ? "Create staff account" : "Reset password";
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-md space-y-4 px-5 py-10">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Admins · Field crews</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">Residents don't need an account — <Link to="/report" className="text-primary hover:underline">report a problem</Link> or <Link to="/track" className="text-primary hover:underline">track a ticket</Link>.</p>
        </div>
        <Panel title={title}>
          <form className="space-y-3" onSubmit={(e) => void submit(e)}>
            {mode === "signup" && <div><Label htmlFor="name">Name</Label><Input id="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>}
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
            {mode !== "forgot" && <div><Label htmlFor="password">Password</Label><Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></div>}
            {msg && <p role="alert" className={msg.ok ? "text-sm text-sev-low" : "text-sm text-destructive"}>{msg.text}</p>}
            <Button type="submit" className="w-full glow" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}</Button>
          </form>
          <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
            {mode !== "signin" && <button className="text-primary hover:underline" onClick={() => { setMode("signin"); setMsg(null); }}>Back to sign in</button>}
            {mode === "signin" && <button className="text-primary hover:underline" onClick={() => { setMode("signup"); setMsg(null); }}>Create an account</button>}
            {mode === "signin" && <button className="text-muted-foreground hover:text-foreground" onClick={() => { setMode("forgot"); setMsg(null); }}>Forgot password?</button>}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">The first account ever created becomes the admin. Everyone else needs an admin to grant crew or admin access.</p>
        </Panel>
      </main>
    </div>
  );
}
