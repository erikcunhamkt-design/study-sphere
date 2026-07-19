import { describe, expect, it } from "vitest";

import { loginSchema } from "./login";

describe("loginSchema (validação do formulário de login)", () => {
  it("aceita e-mail e senha válidos", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });

  it("rejeita e-mail inválido", () => {
    const r = loginSchema.safeParse({ email: "nao-e-email", password: "x" });
    expect(r.success).toBe(false);
  });

  it("rejeita senha vazia", () => {
    const r = loginSchema.safeParse({ email: "a@b.com", password: "" });
    expect(r.success).toBe(false);
  });

  it("rejeita campos totalmente vazios com um erro por campo", () => {
    const r = loginSchema.safeParse({ email: "", password: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("email");
      expect(paths).toContain("password");
    }
  });
});
