import { describe, expect, it } from "vitest";

import { lessonEditorSchema } from "./schema";

/**
 * O schema do caderno é a lista fechada de blocos autorizados pelo plano
 * (Fases 03.1 + 03.2). Nada além disso pode existir — em particular nada
 * de colunas (o multi-coluna oficial é @blocknote/xl-*, GPL-3.0, vetado
 * por licença desde a Fase 03.0).
 */
describe("lessonEditorSchema", () => {
  const EXPECTED_TYPES = [
    // Fase 03.1
    "paragraph",
    "heading",
    "bulletListItem",
    "numberedListItem",
    "checkListItem",
    "toggleListItem",
    "quote",
    "codeBlock",
    "divider",
    "callout",
    // Fase 03.2
    "image",
    "video",
    "audio",
    "file",
    "table",
    "bookmark",
    "tableOfContents",
  ].sort();

  it("contém exatamente os blocos autorizados, nem um a mais", () => {
    expect(Object.keys(lessonEditorSchema.blockSchema).sort()).toEqual(EXPECTED_TYPES);
  });

  it("não contém nenhum bloco de coluna (licença GPL vetada)", () => {
    const types = Object.keys(lessonEditorSchema.blockSchema);
    expect(types.some((t) => /column/i.test(t))).toBe(false);
  });

  it("bookmark e índice estão registrados com as props esperadas", () => {
    expect(lessonEditorSchema.blockSchema.bookmark.propSchema).toMatchObject({
      url: { default: "" },
      title: { default: "" },
    });
    expect(lessonEditorSchema.blockSchema.tableOfContents.propSchema).toEqual({});
  });
});
