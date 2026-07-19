import { describe, expect, it } from "vitest";

import { signupSchema } from "./cadastro";

const VALID = {
  fullName: "Maria Teste",
  email: "maria@example.com",
  password: "Senha1234",
  confirm: "Senha1234",
  terms: true as const,
};

describe("signupSchema (validação do formulário de cadastro)", () => {
  it("aceita dados válidos", () => {
    expect(signupSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejeita e-mail inválido", () => {
    expect(signupSchema.safeParse({ ...VALID, email: "nao-e-email" }).success).toBe(false);
  });

  it("rejeita senha abaixo de 8 caracteres", () => {
    expect(signupSchema.safeParse({ ...VALID, password: "ab12", confirm: "ab12" }).success).toBe(
      false,
    );
  });

  it("rejeita senha sem número", () => {
    expect(
      signupSchema.safeParse({ ...VALID, password: "SenhaSenha", confirm: "SenhaSenha" }).success,
    ).toBe(false);
  });

  it("rejeita senha sem letra", () => {
    expect(
      signupSchema.safeParse({ ...VALID, password: "12345678", confirm: "12345678" }).success,
    ).toBe(false);
  });

  it("rejeita quando confirmação não bate com a senha", () => {
    const r = signupSchema.safeParse({ ...VALID, confirm: "OutraSenha1" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === "confirm")).toBe(true);
  });

  it("rejeita quando os termos não foram aceitos", () => {
    expect(signupSchema.safeParse({ ...VALID, terms: false }).success).toBe(false);
  });

  it("rejeita nome com 1 caractere", () => {
    expect(signupSchema.safeParse({ ...VALID, fullName: "A" }).success).toBe(false);
  });

  it("rejeita todos os campos vazios", () => {
    const r = signupSchema.safeParse({
      fullName: "",
      email: "",
      password: "",
      confirm: "",
      terms: false,
    });
    expect(r.success).toBe(false);
  });
});
