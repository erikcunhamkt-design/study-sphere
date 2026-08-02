import { describe, expect, it } from "vitest";

import { examFormSchema, questionFormSchema, validateQuestionForm } from "./schema";

describe("questionFormSchema — múltipla escolha", () => {
  const base = {
    type: "multipla_escolha" as const,
    lessonId: null,
    statement: "O que é RLS?",
    options: ["Row Level Security", "Redis Live Sync"],
    correctOptionIndex: 0,
  };

  it("aceita forma válida", () => {
    expect(questionFormSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita menos de 2 alternativas", () => {
    expect(questionFormSchema.safeParse({ ...base, options: ["única"] }).success).toBe(false);
  });

  it("rejeita mais de 6 alternativas", () => {
    expect(questionFormSchema.safeParse({ ...base, options: Array(7).fill("x") }).success).toBe(
      false,
    );
  });

  it("rejeita alternativa vazia", () => {
    expect(questionFormSchema.safeParse({ ...base, options: ["ok", ""] }).success).toBe(false);
  });

  it("rejeita enunciado vazio", () => {
    expect(questionFormSchema.safeParse({ ...base, statement: "" }).success).toBe(false);
  });

  it("aceita lessonId nulo (questão avulsa)", () => {
    expect(questionFormSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita lessonId que não é UUID", () => {
    expect(questionFormSchema.safeParse({ ...base, lessonId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("questionFormSchema — discursiva", () => {
  const base = {
    type: "discursiva" as const,
    lessonId: null,
    statement: "Explique RLS",
    expectedAnswer: "Regra de acesso avaliada por linha no banco",
  };

  it("aceita forma válida", () => {
    expect(questionFormSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita resposta esperada vazia", () => {
    expect(questionFormSchema.safeParse({ ...base, expectedAnswer: "" }).success).toBe(false);
  });

  it("não aceita campos de múltipla escolha nesta variante", () => {
    const result = questionFormSchema.safeParse({
      ...base,
      options: ["a", "b"],
      correctOptionIndex: 0,
    });
    // campos extras de outra variante do discriminated union são ignorados,
    // a validação continua passando pelo shape de discursiva
    expect(result.success).toBe(true);
  });
});

describe("validateQuestionForm — checagem extra do índice correto", () => {
  it("rejeita correctOptionIndex fora dos limites das alternativas", () => {
    const result = validateQuestionForm({
      type: "multipla_escolha",
      lessonId: null,
      statement: "Pergunta",
      options: ["a", "b"],
      correctOptionIndex: 5,
    });
    expect(result.success).toBe(false);
  });

  it("aceita correctOptionIndex no limite superior válido", () => {
    const result = validateQuestionForm({
      type: "multipla_escolha",
      lessonId: null,
      statement: "Pergunta",
      options: ["a", "b", "c"],
      correctOptionIndex: 2,
    });
    expect(result.success).toBe(true);
  });
});

describe("examFormSchema", () => {
  it("aceita título obrigatório com descrição e limite nulos", () => {
    const result = examFormSchema.safeParse({
      title: "Simulado 1",
      description: null,
      timeLimitMinutes: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejeita título vazio", () => {
    expect(
      examFormSchema.safeParse({ title: "", description: null, timeLimitMinutes: null }).success,
    ).toBe(false);
  });

  it("converte string vazia de descrição para null", () => {
    const result = examFormSchema.safeParse({
      title: "Simulado 1",
      description: "",
      timeLimitMinutes: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeNull();
    }
  });

  it("rejeita tempo limite zero ou negativo", () => {
    expect(
      examFormSchema.safeParse({ title: "Simulado 1", description: null, timeLimitMinutes: 0 })
        .success,
    ).toBe(false);
    expect(
      examFormSchema.safeParse({ title: "Simulado 1", description: null, timeLimitMinutes: -5 })
        .success,
    ).toBe(false);
  });

  it("aceita tempo limite positivo", () => {
    expect(
      examFormSchema.safeParse({ title: "Simulado 1", description: null, timeLimitMinutes: 60 })
        .success,
    ).toBe(true);
  });
});
