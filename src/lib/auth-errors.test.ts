import { describe, expect, it } from "vitest";

import { friendlyAuthError } from "./auth-errors";

describe("friendlyAuthError", () => {
  it("traduz credenciais inválidas", () => {
    expect(friendlyAuthError("Invalid login credentials")).toBe("E-mail ou senha incorretos.");
  });

  it("traduz e-mail não confirmado", () => {
    expect(friendlyAuthError("Email not confirmed")).toBe("Confirme seu e-mail antes de entrar.");
  });

  it("traduz senha fraca/vazada sem expor o texto técnico original", () => {
    const msg = friendlyAuthError(
      "Password is known to be weak and easy to guess, please choose a different one.",
    );
    expect(msg).not.toMatch(/weak|guess/i);
    expect(msg.length).toBeGreaterThan(0);
  });

  it("traduz rate limit", () => {
    expect(friendlyAuthError("email rate limit exceeded")).toMatch(/aguarde/i);
  });

  it("cai num fallback genérico para mensagens desconhecidas, sem vazar o texto original", () => {
    const original = "some very specific internal postgres constraint violation xyz123";
    const msg = friendlyAuthError(original);
    expect(msg).not.toBe(original);
    expect(msg).toBe("Verifique seus dados e tente novamente.");
  });
});
