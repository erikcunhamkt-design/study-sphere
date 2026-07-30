import { describe, expect, it } from "vitest";

import { MAX_DOCUMENT_BLOCKS, MAX_DOCUMENT_DEPTH, validateLessonDocument } from "./document-schema";

interface TestBlock {
  id: string;
  type: string;
  props: Record<string, unknown>;
  content?: unknown[];
  children: TestBlock[];
}

function paragraph(id: string, text = "texto"): TestBlock {
  return {
    id,
    type: "paragraph",
    props: {},
    content: [{ type: "text", text, styles: {} }],
    children: [],
  };
}

describe("lessonDocumentSchema", () => {
  it("aceita um documento válido simples", () => {
    const result = validateLessonDocument([paragraph("a"), paragraph("b")]);
    expect(result.success).toBe(true);
  });

  it("rejeita raiz que não é array", () => {
    expect(validateLessonDocument({ not: "an array" }).success).toBe(false);
    expect(validateLessonDocument("string").success).toBe(false);
    expect(validateLessonDocument(null).success).toBe(false);
  });

  it("aceita documento vazio (array vazio)", () => {
    expect(validateLessonDocument([]).success).toBe(true);
  });

  it(`rejeita mais de ${MAX_DOCUMENT_BLOCKS} blocos`, () => {
    const blocks = Array.from({ length: MAX_DOCUMENT_BLOCKS + 1 }, (_, i) => paragraph(`id-${i}`));
    const result = validateLessonDocument(blocks);
    expect(result.success).toBe(false);
  });

  it(`aceita exatamente ${MAX_DOCUMENT_BLOCKS} blocos`, () => {
    const blocks = Array.from({ length: MAX_DOCUMENT_BLOCKS }, (_, i) => paragraph(`id-${i}`));
    expect(validateLessonDocument(blocks).success).toBe(true);
  });

  it(`rejeita profundidade acima de ${MAX_DOCUMENT_DEPTH} níveis`, () => {
    let block = paragraph("leaf");
    for (let i = 0; i < MAX_DOCUMENT_DEPTH + 1; i++) {
      block = { ...paragraph(`level-${i}`), children: [block] };
    }
    expect(validateLessonDocument([block]).success).toBe(false);
  });

  it(`aceita profundidade de exatamente ${MAX_DOCUMENT_DEPTH} níveis`, () => {
    let block = paragraph("leaf");
    for (let i = 0; i < MAX_DOCUMENT_DEPTH - 1; i++) {
      block = { ...paragraph(`level-${i}`), children: [block] };
    }
    expect(validateLessonDocument([block]).success).toBe(true);
  });

  it("rejeita IDs de bloco duplicados, inclusive entre pai e filho aninhado", () => {
    const child = paragraph("dup");
    const parent = { ...paragraph("dup"), children: [child] };
    expect(validateLessonDocument([parent]).success).toBe(false);
  });

  it("aceita IDs únicos em blocos aninhados", () => {
    const child = paragraph("child-1");
    const parent = { ...paragraph("parent-1"), children: [child] };
    expect(validateLessonDocument([parent]).success).toBe(true);
  });

  it("rejeita tipo de bloco fora do schema (ex.: kanban, columnList)", () => {
    const kanban = { ...paragraph("a"), type: "kanban" };
    expect(validateLessonDocument([kanban]).success).toBe(false);

    const columns = { ...paragraph("b"), type: "columnList" };
    expect(validateLessonDocument([columns]).success).toBe(false);
  });

  // ── Fase 03.2 — mídia, tabela, bookmark e índice ──────────────────

  it("aceita blocos de mídia com caminho do storage ou https", () => {
    const image = {
      id: "img-1",
      type: "image",
      props: { url: "0de70ee8-1111/aula-1/foto.png", name: "foto.png", previewWidth: 512 },
      children: [],
    };
    const video = {
      id: "vid-1",
      type: "video",
      props: { url: "https://exemplo.com/aula.mp4", caption: "aula" },
      children: [],
    };
    expect(validateLessonDocument([image, video]).success).toBe(true);
  });

  it("rejeita mídia com esquema perigoso ou não-http", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,x",
      "vbscript:x",
      "file:///etc/passwd",
      "ftp://servidor/arquivo",
    ]) {
      const block = { id: "m", type: "image", props: { url }, children: [] };
      expect(validateLessonDocument([block]).success, url).toBe(false);
    }
  });

  it("bookmark aceita só http(s) e rejeita esquemas perigosos", () => {
    const valid = {
      id: "b-1",
      type: "bookmark",
      props: { url: "https://exemplo.com/artigo", title: "Artigo" },
      children: [],
    };
    expect(validateLessonDocument([valid]).success).toBe(true);

    const semEsquema = { id: "b-2", type: "bookmark", props: { url: "exemplo.com" }, children: [] };
    expect(validateLessonDocument([semEsquema]).success).toBe(false);

    const perigoso = {
      id: "b-3",
      type: "bookmark",
      props: { url: "javascript:alert(1)" },
      children: [],
    };
    expect(validateLessonDocument([perigoso]).success).toBe(false);
  });

  it("tabela aceita conteúdo tableContent válido", () => {
    const table = {
      id: "t-1",
      type: "table",
      props: {},
      content: {
        type: "tableContent",
        columnWidths: [null, 120],
        rows: [
          {
            cells: [
              {
                type: "tableCell",
                content: [{ type: "text", text: "célula", styles: {} }],
                props: {},
              },
              [{ type: "text", text: "formato-array", styles: {} }],
            ],
          },
        ],
      },
      children: [],
    };
    expect(validateLessonDocument([table]).success).toBe(true);
  });

  it("rejeita tableContent fora de um bloco de tabela e vice-versa", () => {
    const paragrafoComTabela = {
      id: "p-t",
      type: "paragraph",
      props: {},
      content: { type: "tableContent", rows: [] },
      children: [],
    };
    expect(validateLessonDocument([paragrafoComTabela]).success).toBe(false);

    const tabelaComInline = {
      id: "t-i",
      type: "table",
      props: {},
      content: [{ type: "text", text: "solto", styles: {} }],
      children: [],
    };
    expect(validateLessonDocument([tabelaComInline]).success).toBe(false);
  });

  it("índice não aceita props desconhecidas", () => {
    const valid = { id: "toc-1", type: "tableOfContents", props: {}, children: [] };
    expect(validateLessonDocument([valid]).success).toBe(true);

    const invalid = {
      id: "toc-2",
      type: "tableOfContents",
      props: { fonte: "externa" },
      children: [],
    };
    expect(validateLessonDocument([invalid]).success).toBe(false);
  });

  it("callout aceita só info/attention/success", () => {
    const valid = { ...paragraph("c"), type: "callout", props: { type: "attention" } };
    expect(validateLessonDocument([valid]).success).toBe(true);

    const invalid = { ...paragraph("c"), type: "callout", props: { type: "danger" } };
    expect(validateLessonDocument([invalid]).success).toBe(false);
  });

  it("rejeita link com href javascript: (XSS)", () => {
    const block = {
      ...paragraph("a"),
      content: [
        {
          type: "link",
          href: "javascript:alert(1)",
          content: [{ type: "text", text: "clique", styles: {} }],
        },
      ],
    };
    expect(validateLessonDocument([block]).success).toBe(false);
  });

  it("rejeita link com href data: (XSS)", () => {
    const block = {
      ...paragraph("a"),
      content: [
        {
          type: "link",
          href: "data:text/html,<script>alert(1)</script>",
          content: [{ type: "text", text: "clique", styles: {} }],
        },
      ],
    };
    expect(validateLessonDocument([block]).success).toBe(false);
  });

  it("aceita link com href https:// normal", () => {
    const block = {
      ...paragraph("a"),
      content: [
        {
          type: "link",
          href: "https://example.com",
          content: [{ type: "text", text: "clique", styles: {} }],
        },
      ],
    };
    expect(validateLessonDocument([block]).success).toBe(true);
  });

  it("heading aceita apenas níveis 1-3", () => {
    const valid = { ...paragraph("h"), type: "heading", props: { level: 2 } };
    expect(validateLessonDocument([valid]).success).toBe(true);

    const invalid = { ...paragraph("h"), type: "heading", props: { level: 4 } };
    expect(validateLessonDocument([invalid]).success).toBe(false);
  });

  it("checkListItem aceita apenas checked booleano", () => {
    const valid = { ...paragraph("t"), type: "checkListItem", props: { checked: true } };
    expect(validateLessonDocument([valid]).success).toBe(true);

    const invalid = { ...paragraph("t"), type: "checkListItem", props: { checked: "sim" } };
    expect(validateLessonDocument([invalid]).success).toBe(false);
  });
});
