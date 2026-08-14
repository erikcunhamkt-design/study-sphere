import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";

import { DesktopSidebar, MobileNav } from "@/components/layout/navigation";
import { TopBar } from "@/components/layout/topbar";
import { RouteLoading } from "@/components/route-loading";
import { usePreferences, useUpdatePreferences } from "@/hooks/use-preferences";
import { requireAuth } from "@/lib/route-guards";

export const Route = createFileRoute("/app")({
  // O layout autenticado nunca é renderizado no servidor: a sessão do
  // Supabase vive em localStorage e não existe durante o SSR, então essa
  // decisão de acesso só pode ser tomada com segurança no cliente.
  ssr: false,
  beforeLoad: ({ context, location }) => requireAuth(context.auth, location.href),
  pendingComponent: RouteLoading,
  component: AppShell,
});

function AppShell() {
  const { data: prefs } = usePreferences();
  const updatePrefs = useUpdatePreferences();
  const collapsed = prefs?.sidebar_collapsed ?? false;

  useEffect(() => {
    // sem efeito colateral inicial — sync ocorre no toggle
  }, []);

  return (
    <div className="flex h-dvh bg-background text-foreground overflow-hidden">
      <DesktopSidebar
        collapsed={collapsed}
        onToggle={() => updatePrefs.mutate({ sidebar_collapsed: !collapsed })}
      />
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <TopBar />
        <main className="flex-1 min-w-0 overflow-y-auto px-4 md:px-6 py-6 pb-24 lg:pb-6 scroll-smooth">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
