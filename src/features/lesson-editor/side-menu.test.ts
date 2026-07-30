import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vitest";

import { labEditorSchema } from "@/features/lab-editor/schema";

/**
 * Evidência real (não só afirmação em comentário) de que
 * editor.updateBlock(id, {type}) — usado por TransformTypeItems em
 * side-menu.tsx para "transformar tipo de bloco" — preserva ID, conteúdo
 * inline, estilos e filhos do bloco. Sem isso, transformar um bloco com
 * texto/filhos perderia dados silenciosamente.
 */
describe("transformar tipo de bloco — updateBlock preserva ID/conteúdo/filhos", () => {
  it("preserva o ID ao transformar paragraph em heading", () => {
    const editor = BlockNoteEditor.create({ schema: labEditorSchema });
    const original = editor.document[0];

    editor.updateBlock(original.id, { type: "heading", props: { level: 1 } });

    expect(editor.document).toHaveLength(1);
    expect(editor.document[0].id).toBe(original.id);
    expect(editor.document[0].type).toBe("heading");
  });

  it("preserva o conteúdo inline (texto e estilos) ao transformar o tipo", () => {
    const editor = BlockNoteEditor.create({
      schema: labEditorSchema,
      initialContent: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "texto em negrito", styles: { bold: true } }],
        },
      ],
    });
    const original = editor.document[0];

    editor.updateBlock(original.id, { type: "bulletListItem" });

    const updated = editor.document[0];
    expect(updated.id).toBe(original.id);
    expect(updated.content).toEqual(original.content);
  });

  it("preserva os blocos filhos (aninhados) ao transformar o tipo do pai", () => {
    const editor = BlockNoteEditor.create({
      schema: labEditorSchema,
      initialContent: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "pai", styles: {} }],
          children: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "filho", styles: {} }],
            },
          ],
        },
      ],
    });
    const original = editor.document[0];
    const originalChildIds = original.children.map((c) => c.id);

    editor.updateBlock(original.id, { type: "quote" });

    const updated = editor.document[0];
    expect(updated.id).toBe(original.id);
    expect(updated.children.map((c) => c.id)).toEqual(originalChildIds);
    expect(updated.children).toHaveLength(1);
  });
});
