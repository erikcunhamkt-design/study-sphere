import { redirect } from "@tanstack/react-router";

import type { AuthStore } from "@/lib/auth-store";

/**
 * Usado no beforeLoad de rotas privadas (ex.: /app). Aguarda a restauração
 * da sessão e redireciona para /login preservando a rota originalmente
 * pedida, se ainda não houver sessão.
 */
export async function requireAuth(auth: AuthStore, requestedHref: string): Promise<void> {
  const session = await auth.ensureInitialized();
  if (!session) {
    throw redirect({ to: "/login", search: { redirect: requestedHref } });
  }
}

/**
 * Usado no beforeLoad de rotas só-para-visitantes (/login, /cadastro).
 * Redireciona para /app se já houver uma sessão válida.
 */
export async function redirectIfAuthenticated(auth: AuthStore): Promise<void> {
  const session = await auth.ensureInitialized();
  if (session) {
    throw redirect({ to: "/app" });
  }
}
