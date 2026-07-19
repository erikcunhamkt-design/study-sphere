import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";

import { authStore } from "@/lib/auth-store";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { session, initialized } = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    authStore.getSnapshot,
  );

  useEffect(() => {
    void authStore.ensureInitialized();
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading: !initialized,
    signOut: authStore.signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}

/**
 * signOut() sozinho só limpa a sessão do Supabase — como beforeLoad só
 * roda em transições de rota, ficar em /app sem navegar deixaria o layout
 * privado montado (com dados esvaziados, não vazados, mas visualmente
 * "preso" até o usuário navegar ou recarregar). Este hook encapsula o
 * signOut + limpeza do cache do React Query (evita reter queries de
 * profile/preferences da sessão anterior) + navegação para /login, para
 * todo controle de logout (topbar, sidebar, menu mobile) usar o mesmo
 * caminho.
 */
export function useSignOut(): () => Promise<void> {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return async () => {
    await authStore.signOut();
    queryClient.clear();
    await navigate({ to: "/login", replace: true });
  };
}
