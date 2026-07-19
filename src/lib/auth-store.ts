import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  session: Session | null;
  initialized: boolean;
}

type Listener = () => void;

let state: AuthState = { session: null, initialized: false };
let initPromise: Promise<Session | null> | null = null;
const listeners = new Set<Listener>();

function setState(session: Session | null) {
  state = { session, initialized: true };
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  // Listener primeiro (evita corridas): supabase-js emite um evento
  // INITIAL_SESSION assim que a subscrição é feita, então o listener
  // sozinho já cobre a restauração inicial da sessão a partir do
  // localStorage; getSession() abaixo é apenas uma segunda garantia.
  supabase.auth.onAuthStateChange((_event, session) => {
    setState(session);
  });
}

/**
 * Single source of truth for auth state, shared between the TanStack Router
 * `beforeLoad` guards (route context) and the React `useAuth()` hook
 * (via useSyncExternalStore), so both agree on the same session at all times.
 */
export const authStore = {
  getSnapshot(): AuthState {
    return state;
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /**
   * Resolves once the initial session restore (from localStorage) has
   * completed. Safe to call from multiple concurrent `beforeLoad`s — the
   * underlying getSession() call only happens once.
   */
  async ensureInitialized(): Promise<Session | null> {
    if (state.initialized) return state.session;
    if (typeof window === "undefined") {
      // No persisted session is reachable during SSR (Supabase session
      // lives in localStorage). Routes that gate on auth must be ssr:false
      // so this codepath never drives a real routing decision.
      return null;
    }
    if (!initPromise) {
      initPromise = supabase.auth.getSession().then(({ data }) => {
        if (!state.initialized) setState(data.session);
        return state.session;
      });
    }
    return initPromise;
  },
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },
};

export type AuthStore = typeof authStore;
