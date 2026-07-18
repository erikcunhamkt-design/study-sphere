import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { DesktopSidebar, MobileNav } from "@/components/layout/navigation";
import { TopBar } from "@/components/layout/topbar";
import { useAuth } from "@/hooks/use-auth";
import { usePreferences, useUpdatePreferences } from "@/hooks/use-preferences";

export const Route = createFileRoute("/app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return <AppShell />;
}

function AppShell() {
  const { data: prefs } = usePreferences();
  const updatePrefs = useUpdatePreferences();
  const collapsed = prefs?.sidebar_collapsed ?? false;

  useEffect(() => {
    // sem efeito colateral inicial — sync ocorre no toggle
  }, []);

  return (
    <div className="min-h-dvh flex bg-background text-foreground">
      <DesktopSidebar
        collapsed={collapsed}
        onToggle={() => updatePrefs.mutate({ sidebar_collapsed: !collapsed })}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <main className="flex-1 min-w-0 px-4 md:px-6 py-6 pb-24 lg:pb-6">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
