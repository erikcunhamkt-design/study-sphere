import { describe, expect, it } from "vitest";

import {
  blurtingDetailsSchema,
  cornellDetailsSchema,
  feynmanDetailsSchema,
  initialDetailsForMethod,
  livreDetailsSchema,
  pomodoroDetailsSchema,
  startSessionSchema,
} from "./schema";

describe("startSessionSchema", () => {
  it("aceita método válido com lessonId nulo (sessão avulsa)", () => {
    expect(startSessionSchema.safeParse({ method: "pomodoro", lessonId: null }).success).toBe(true);
  });

  it("rejeita método fora do enum", () => {
    expect(startSessionSchema.safeParse({ method: "yoga", lessonId: null }).success).toBe(false);
  });

  it("rejeita lessonId que não é UUID", () => {
    expect(startSessionSchema.safeParse({ method: "livre", lessonId: "not-a-uuid" }).success).toBe(
      false,
    );
  });
});

describe("detalhes por método", () => {
  it("pomodoro exige cycles_completed inteiro >= 0", () => {
    expect(pomodoroDetailsSchema.safeParse({ cycles_completed: 3 }).success).toBe(true);
    expect(pomodoroDetailsSchema.safeParse({ cycles_completed: -1 }).success).toBe(false);
    expect(pomodoroDetailsSchema.safeParse({ cycles_completed: 1.5 }).success).toBe(false);
  });

  it("feynman aceita texto vazio (sessão recém-criada) e texto normal", () => {
    expect(feynmanDetailsSchema.safeParse({ explicacao: "" }).success).toBe(true);
    expect(feynmanDetailsSchema.safeParse({ explicacao: "RLS é..." }).success).toBe(true);
  });

  it("feynman rejeita texto acima do teto de sanidade", () => {
    expect(feynmanDetailsSchema.safeParse({ explicacao: "a".repeat(20001) }).success).toBe(false);
  });

  it("blurting valida o campo texto", () => {
    expect(blurtingDetailsSchema.safeParse({ texto: "tudo que lembro" }).success).toBe(true);
  });

  it("cornell exige os três campos (podem ser vazios)", () => {
    expect(cornellDetailsSchema.safeParse({ notas: "", pistas: "", resumo: "" }).success).toBe(
      true,
    );
    expect(cornellDetailsSchema.safeParse({ notas: "só notas" }).success).toBe(false);
  });

  it("livre aceita nota ausente ou presente", () => {
    expect(livreDetailsSchema.safeParse({}).success).toBe(true);
    expect(livreDetailsSchema.safeParse({ nota: "revisão de código civil" }).success).toBe(true);
  });
});

describe("initialDetailsForMethod", () => {
  it("gera a forma inicial correta por método", () => {
    expect(initialDetailsForMethod("pomodoro")).toEqual({ cycles_completed: 0 });
    expect(initialDetailsForMethod("feynman")).toEqual({ explicacao: "" });
    expect(initialDetailsForMethod("blurting")).toEqual({ texto: "" });
    expect(initialDetailsForMethod("cornell")).toEqual({ notas: "", pistas: "", resumo: "" });
    expect(initialDetailsForMethod("livre")).toEqual({});
    expect(initialDetailsForMethod("flashcards")).toEqual({});
  });

  it("toda forma inicial passa na validação do próprio método (exceto flashcards, que não tem sessão)", () => {

    expect(pomodoroDetailsSchema.safeParse(initialDetailsForMethod("pomodoro")).success).toBe(true);
    expect(feynmanDetailsSchema.safeParse(initialDetailsForMethod("feynman")).success).toBe(true);
    expect(blurtingDetailsSchema.safeParse(initialDetailsForMethod("blurting")).success).toBe(true);
    expect(cornellDetailsSchema.safeParse(initialDetailsForMethod("cornell")).success).toBe(true);
    expect(livreDetailsSchema.safeParse(initialDetailsForMethod("livre")).success).toBe(true);
  });
});
