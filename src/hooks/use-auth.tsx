import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
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
