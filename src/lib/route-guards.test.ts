import { describe, expect, it } from "vitest";
import type { Session } from "@supabase/supabase-js";

import { requireAuth, redirectIfAuthenticated } from "./route-guards";
import type { AuthStore } from "./auth-store";

function fakeAuth(session: Session | null): AuthStore {
  return {
    getSnapshot: () => ({ session, initialized: true }),
    subscribe: () => () => {},
    ensureInitialized: async () => session,
    signOut: async () => {},
  };
}

const FAKE_SESSION = { user: { id: "u1" } } as unknown as Session;

describe("requireAuth (guarda de rota privada, ex.: /app)", () => {
  it("redireciona para /login preservando a rota pedida quando não há sessão", async () => {
    await expect(requireAuth(fakeAuth(null), "/app/desempenho")).rejects.toMatchObject({
      options: { to: "/login", search: { redirect: "/app/desempenho" } },
    });
  });

  it("não redireciona quando há sessão", async () => {
    await expect(requireAuth(fakeAuth(FAKE_SESSION), "/app")).resolves.toBeUndefined();
  });
});

describe("redirectIfAuthenticated (guarda de rota pública, ex.: /login e /cadastro)", () => {
  it("redireciona para /app quando já há sessão", async () => {
    await expect(redirectIfAuthenticated(fakeAuth(FAKE_SESSION))).rejects.toMatchObject({
      options: { to: "/app" },
    });
  });

  it("não redireciona quando não há sessão", async () => {
    await expect(redirectIfAuthenticated(fakeAuth(null))).resolves.toBeUndefined();
  });
});
