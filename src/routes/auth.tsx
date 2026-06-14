import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Instractor sign in  Attendance" },
      { name: "description", content: "Sign in with Google to manage your course attendance." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: window.location.origin + "/auth",
  },
});

  if (error) {
    toast.error(error.message ?? "Sign in failed");
    setLoading(false);
  }
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md p-8 space-y-6 text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center">
          <GraduationCap className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Sign In</h1>
          <p className="text-sm text-muted-foreground">
            Use your Google account to manage courses and take attendance.
          </p>
        </div>
        <Button onClick={signIn} disabled={loading} size="lg" className="w-full">
          {loading ? "Redirecting…" : "Continue with Google"}
        </Button>
      </Card>
    </div>
  );
}
