import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/sentinel/ui";
import { Button } from "@/components/ui/button";
import { signOut, useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } });
  },
  component: StaffGate,
});

function StaffGate() {
  const { ready, isStaff, user } = useAuth();
  if (!ready) return <div className="min-h-screen"><AppHeader /><p className="p-8 text-center text-sm text-muted-foreground">Checking access…</p></div>;
  if (!isStaff) return (
    <div className="min-h-screen"><AppHeader />
      <main className="mx-auto max-w-md space-y-3 px-5 py-16 text-center">
        <h1 className="text-2xl font-bold">Staff access needed</h1>
        <p className="text-sm text-muted-foreground">You're signed in as {user?.email}, but this account hasn't been given admin or crew access yet. Ask a CivicAI Sentinel admin to add you on the Team page.</p>
        <div className="flex justify-center gap-2"><Button asChild variant="outline"><Link to="/report">Report a problem</Link></Button><Button asChild variant="outline"><Link to="/track">Track a ticket</Link></Button><Button variant="ghost" onClick={() => void signOut()}>Sign out</Button></div>
      </main>
    </div>
  );
  return <Outlet />;
}
