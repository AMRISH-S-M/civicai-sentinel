import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader, Panel } from "@/components/sentinel/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a New Password — CivicAI Sentinel" },
      { name: "description", content: "Choose a new password for your CivicAI Sentinel staff account." },
      { property: "og:title", content: "Set a New Password — CivicAI Sentinel" },
      { property: "og:description", content: "Password reset for CivicAI Sentinel staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setMsg("Use at least 8 characters.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg(error.message);
    void navigate({ to: "/" });
  }
  return (
    <div className="min-h-screen"><AppHeader />
      <main className="mx-auto max-w-md px-5 py-10">
        <Panel title="Set a new password">
          <form className="space-y-3" onSubmit={(e) => void submit(e)}>
            <div><Label htmlFor="pw">New password</Label><Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></div>
            {msg && <p role="alert" className="text-sm text-destructive">{msg}</p>}
            <Button type="submit" className="w-full" disabled={busy}>Save password</Button>
          </form>
        </Panel>
      </main>
    </div>
  );
}
