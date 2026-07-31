import { describe, expect, it } from "vitest";

import {
  flashcardContentSchema,
  flashcardFormSchema,
  flashcardRatingSchema,
  plainTextToInlineContent,
  resolveFrontContentForSubmit,
  textFromInlineContent,
  type OriginalFrontContent,
} from "./schema";

describe("flashcardContentSchema", () => {
  it("aceita conteúdo inline simples", () => {
    const result = flashcardContentSchema.safeParse([
      { type: "text", text: "O que é RLS?", styles: {} },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejeita array vazio (cartão sem conteúdo)", () => {
    expect(flashcardContentSchema.safeParse([]).success).toBe(false);
  });

  it("rejeita raiz que não é array", () => {
    expect(flashcardContentSchema.safeParse("texto solto").success).toBe(false);
    expect(flashcardContentSchema.safeParse(null).success).toBe(false);
  });

  it("aceita link com href https://", () => {
    const result = flashcardContentSchema.safeParse([
      {
        type: "link",
        href: "https://example.com",
        content: [{ type: "text", text: "clique", styles: {} }],
      },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejeita link com href javascript: (XSS)", () => {
    const result = flashcardContentSchema.safeParse([
      {
        type: "link",
        href: "javascript:alert(1)",
        content: [{ type: "text", text: "clique", styles: {} }],
      },
    ]);
    expect(result.success).toBe(false);
  });

  it("rejeita link com href data: (XSS)", () => {
    const result = flashcardContentSchema.safeParse([
      {
        type: "link",
        href: "data:text/html,<script>alert(1)</script>",
        content: [{ type: "text", text: "clique", styles: {} }],
      },
    ]);
    expect(result.success).toBe(false);
  });

  it("rejeita tipo de item fora do schema", () => {
    expect(flashcardContentSchema.safeParse([{ type: "image", url: "x" }]).success).toBe(false);
  });
});

describe("flashcardRatingSchema", () => {
  it("aceita as 4 notas válidas", () => {
    for (const rating of ["errei", "dificil", "bom", "facil"]) {
      expect(flashcardRatingSchema.safeParse(rating).success).toBe(true);
    }
  });

  it("rejeita nota fora do enum", () => {
    expect(flashcardRatingSchema.safeParse("otimo").success).toBe(false);
  });
});

describe("flashcardFormSchema", () => {
  const validContent = [{ type: "text" as const, text: "conteúdo", styles: {} }];

  it("aceita form válido com lessonId nulo (cartão avulso)", () => {
    const result = flashcardFormSchema.safeParse({
      lessonId: null,
      sourceBlockId: null,
      front: validContent,
      back: validContent,
    });
    expect(result.success).toBe(true);
  });

  it("aceita form válido com lessonId e sourceBlockId (conversão de bloco)", () => {
    const result = flashcardFormSchema.safeParse({
      lessonId: "550e8400-e29b-41d4-a716-446655440000",
      sourceBlockId: "block-uuid",
      front: validContent,
      back: validContent,
    });
    expect(result.success).toBe(true);
  });

  it("rejeita front ou back vazios", () => {
    expect(
      flashcardFormSchema.safeParse({
        lessonId: null,
        sourceBlockId: null,
        front: [],
        back: validContent,
      }).success,
    ).toBe(false);
    expect(
      flashcardFormSchema.safeParse({
        lessonId: null,
        sourceBlockId: null,
        front: validContent,
        back: [],
      }).success,
    ).toBe(false);
  });

  it("rejeita lessonId que não é UUID", () => {
    expect(
      flashcardFormSchema.safeParse({
        lessonId: "not-a-uuid",
        sourceBlockId: null,
        front: validContent,
        back: validContent,
      }).success,
    ).toBe(false);
  });
});

describe("conversão texto simples <-> conteúdo inline", () => {
  it("plainTextToInlineContent produz um único item de texto sem estilos", () => {
    const content = plainTextToInlineContent("Olá mundo");
    expect(content).toEqual([{ type: "text", text: "Olá mundo", styles: {} }]);
  });

  it("textFromInlineContent extrai texto de itens de texto e de link", () => {
    const text = textFromInlineContent([
      { type: "text", text: "antes ", styles: {} },
      {
        type: "link",
        href: "https://example.com",
        content: [{ type: "text", text: "link", styles: {} }],
      },
      { type: "text", text: " depois", styles: {} },
    ]);
    expect(text).toBe("antes link depois");
  });

  it("round trip plainText -> inline -> plainText preserva o texto", () => {
    const original = "Pergunta com acentuação: RLS é o quê?";
    const content = plainTextToInlineContent(original);
    expect(textFromInlineContent(content)).toBe(original);
  });
});

describe("resolveFrontContentForSubmit — achado do Gate 3 (conversão/edição não podem perder formatação)", () => {
  const richContent: ReturnType<typeof plainTextToInlineContent> = [
    { type: "text", text: "O que é ", styles: {} },
    {
      type: "link",
      href: "https://example.com/rls",
      content: [{ type: "text", text: "RLS", styles: { bold: true } }],
    },
    { type: "text", text: "?", styles: {} },
  ];
  const original: OriginalFrontContent = {
    text: "O que é RLS?",
    content: richContent,
  };

  it("sem edição do texto, persiste o conteúdo rico original intacto", () => {
    const result = resolveFrontContentForSubmit("O que é RLS?", original);
    expect(result).toBe(richContent);
    expect(result).toEqual(richContent);
  });

  it("ignora espaços nas pontas ao comparar (não conta como edição)", () => {
    const result = resolveFrontContentForSubmit("  O que é RLS?  ", original);
    expect(result).toBe(richContent);
  });

  it("com o texto editado, persiste texto simples (formatação anterior é descartada)", () => {
    const result = resolveFrontContentForSubmit("O que é RLS, afinal?", original);
    expect(result).toEqual(plainTextToInlineContent("O que é RLS, afinal?"));
    expect(result).not.toBe(richContent);
  });

  it("sem conteúdo original (criação manual do zero), sempre usa texto simples", () => {
    const result = resolveFrontContentForSubmit("Pergunta nova", null);
    expect(result).toEqual(plainTextToInlineContent("Pergunta nova"));
  });

  it("edição vazia (apagou tudo) não bate com o original — usa texto simples (vazio)", () => {
    const result = resolveFrontContentForSubmit("", original);
    expect(result).toEqual(plainTextToInlineContent(""));
  });
});
