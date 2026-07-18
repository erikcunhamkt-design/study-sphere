import { createFileRoute, Navigate } from "@tanstack/react-router";

import { useAuth } from "@/hooks/use-auth";
import { APP_CONFIG } from "@/lib/app-config";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  if (session) return <Navigate to="/app" replace />;
  return <Navigate to="/login" replace />;
}

// keep name referenced
void APP_CONFIG;
