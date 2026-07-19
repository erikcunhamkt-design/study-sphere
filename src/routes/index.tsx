import { createFileRoute, redirect } from "@tanstack/react-router";

import { RouteLoading } from "@/components/route-loading";

export const Route = createFileRoute("/")({
  // Assim como /app, a decisão depende da sessão em localStorage —
  // indisponível no servidor — então essa rota nunca renderiza via SSR.
  ssr: false,
  beforeLoad: async ({ context }) => {
    const session = await context.auth.ensureInitialized();
    throw redirect({ to: session ? "/app" : "/login", replace: true });
  },
  pendingComponent: RouteLoading,
});
