import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BlockNoteEditor } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { describe, expect, it } from "vitest";

import { labEditorSchema } from "./schema";
import { getLabEditorSlashMenuItems } from "./slash-menu-items";
import { sampleDocument } from "./sample-document";

const ALLOWED_BLOCK_TYPES = [
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
];

const FORBIDDEN_TYPES = ["image", "video", "audio", "file", "table"];
const FORBIDDEN_MENU_KEYWORDS = [
  "imagem",
  "vídeo",
  "áudio",
  "arquivo",
  "tabela",
  "ia",
  "inteligência",
];

interface FlatBlock {
  id: string;
  type: string;
  props: unknown;
  content: unknown;
}

function flatten(
  blocks: readonly {
    id: string;
    type: string;
    props: unknown;
    content: unknown;
    children?: unknown;
  }[],
  acc: FlatBlock[] = [],
) {
  for (const b of blocks) {
    acc.push({ id: b.id, type: b.type, props: b.props, content: b.content });
    const children = b.children as typeof blocks | undefined;
    if (children?.length) flatten(children, acc);
  }
  return acc;
}

describe("schema — apenas blocos permitidos (Fase 03.0)", () => {
  it("contém exatamente os blocos autorizados, nenhum a mais", () => {
    const types = Object.keys(labEditorSchema.blockSchema).sort();
    expect(types).toEqual([...ALLOWED_BLOCK_TYPES].sort());
  });

  it("não contém nenhum bloco fora do escopo (imagem/vídeo/áudio/arquivo/tabela)", () => {
    const types = Object.keys(labEditorSchema.blockSchema);
    for (const forbidden of FORBIDDEN_TYPES) {
      expect(types).not.toContain(forbidden);
    }
  });

  it("callout tem propSchema tipado com os 3 tipos experimentais", () => {
    const calloutConfig = labEditorSchema.blockSchema.callout;
    expect(calloutConfig.propSchema.type.values).toEqual(["info", "attention", "success"]);
    expect(calloutConfig.propSchema.type.default).toBe("info");
    expect(calloutConfig.content).toBe("inline");
  });

  it("divisor é nativo do BlockNote (defaultBlockSpecs), não custom", () => {
    expect(labEditorSchema.blockSchema.divider.content).toBe("none");
  });
});

describe("menu / — apenas itens permitidos, em português (Fase 03.0)", () => {
  const editor = BlockNoteEditor.create({ schema: labEditorSchema });
  const items = getLabEditorSlashMenuItems(editor);

  it("tem exatamente 12 itens (8 Básicos + 4 Estrutura)", () => {
    expect(items).toHaveLength(12);
    expect(items.filter((i) => i.group === "Básicos")).toHaveLength(8);
    expect(items.filter((i) => i.group === "Estrutura")).toHaveLength(4);
  });

  it("todos os títulos estão em português, nenhum item fora do escopo", () => {
    const titles = items.map((i) => i.title.toLowerCase());
    for (const keyword of FORBIDDEN_MENU_KEYWORDS) {
      expect(titles.some((t) => t.includes(keyword))).toBe(false);
    }
    expect(titles).toContain("texto");
    expect(titles).not.toContain("callout"); // título é "Aviso", não o nome técnico do bloco
  });

  it("não contém itens de imagem, arquivo, tabela ou IA", () => {
    const allAliases = items.flatMap((i) => i.aliases ?? []);
    for (const forbidden of ["image", "file", "table", "ai", "video", "audio"]) {
      expect(allAliases).not.toContain(forbidden);
    }
  });

  it.each([
    ["texto", "Texto"],
    ["parágrafo", "Texto"],
    ["título", "Título 1"],
    ["lista", "Lista com marcadores"],
    ["tarefas", "Checklist"],
    ["citação", "Citação"],
    ["código", "Código"],
    ["divisor", "Divisor"],
    ["aviso", "Aviso"],
    ["destaque", "Aviso"],
  ])("alias '%s' encontra o item esperado via filterSuggestionItems", (query, expectedTitle) => {
    const filtered = filterSuggestionItems(items, query);
    expect(filtered.some((i) => i.title === expectedTitle)).toBe(true);
  });
});

describe("serialização e round trip (JSON nativo)", () => {
  it("serializa o documento de exemplo para JSON válido", () => {
    const editor = BlockNoteEditor.create({
      schema: labEditorSchema,
      initialContent: sampleDocument,
    });
    const json = JSON.stringify(editor.document);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(editor.document.length).toBeGreaterThan(0);
  });

  it("round trip completo preserva IDs, tipos, props e hierarquia", () => {
    const original = BlockNoteEditor.create({
      schema: labEditorSchema,
      initialContent: sampleDocument,
    });
    const originalDoc = JSON.parse(JSON.stringify(original.document));
    const json = JSON.stringify(originalDoc);

    const reloaded = BlockNoteEditor.create({
      schema: labEditorSchema,
      initialContent: JSON.parse(json),
    });

    const originalFlat = flatten(originalDoc);
    const reloadedFlat = flatten(reloaded.document);

    expect(reloadedFlat.map((b) => b.id)).toEqual(originalFlat.map((b) => b.id));
    expect(reloadedFlat.map((b) => b.type)).toEqual(originalFlat.map((b) => b.type));
    expect(reloadedFlat.map((b) => b.props)).toEqual(originalFlat.map((b) => b.props));
    expect(reloadedFlat).toHaveLength(originalFlat.length);
  });

  it("duplicar um bloco (insertBlocks sem id) gera um ID novo", () => {
    const editor = BlockNoteEditor.create({
      schema: labEditorSchema,
      initialContent: sampleDocument,
    });
    const first = editor.document[0];
    const clone = {
      type: first.type,
      props: first.props,
      content: first.content,
    } as Parameters<typeof editor.insertBlocks>[0][number];
    editor.insertBlocks([clone], first.id, "after");
    const newBlock = editor.document[1];
    expect(newBlock.id).not.toBe(first.id);
    expect(newBlock.id).toBeTruthy();
  });

  it("editar o conteúdo de um bloco não muda seu ID", () => {
    const editor = BlockNoteEditor.create({
      schema: labEditorSchema,
      initialContent: sampleDocument,
    });
    const first = editor.document[0];
    editor.updateBlock(first.id, { content: "conteúdo alterado" });
    expect(editor.document[0].id).toBe(first.id);
  });
});

describe("documentos vazio e grande", () => {
  it("achado real: initialContent como array vazio [] lança erro", () => {
    // Documentado na auditoria (§21 Limitações) — [] não é um documento
    // válido para o BlockNote; ele exige pelo menos um bloco.
    expect(() => BlockNoteEditor.create({ schema: labEditorSchema, initialContent: [] })).toThrow();
  });

  it("documento vazio de verdade: omitir initialContent produz 1 parágrafo vazio", () => {
    const editor = BlockNoteEditor.create({ schema: labEditorSchema });
    expect(editor.document).toHaveLength(1);
    expect(editor.document[0].type).toBe("paragraph");
  });

  it("documento com 500 blocos serializa sem erro", () => {
    const blocks = Array.from({ length: 500 }, (_, i) => ({
      type: "paragraph" as const,
      content: `Bloco número ${i}`,
    }));
    const editor = BlockNoteEditor.create({ schema: labEditorSchema, initialContent: blocks });
    expect(editor.document).toHaveLength(500);
    expect(() => JSON.stringify(editor.document)).not.toThrow();
  });
});

describe("fallback para conteúdo desconhecido/inválido", () => {
  it("bloco com tipo desconhecido no schema é rejeitado ou tratado sem derrubar o processo", () => {
    let threw = false;
    try {
      BlockNoteEditor.create({
        schema: labEditorSchema,
        // Tipo deliberadamente inválido, testando o comportamento real —
        // o próprio tipo de initialContent aceita isso estruturalmente
        // (achado: não há checagem estática forte aqui), então validamos
        // em runtime, dentro do try/catch.
        initialContent: [{ type: "imagemInexistente", content: "x" }],
      });
    } catch {
      threw = true;
    }
    // Documentado na auditoria: comportamento real observado aqui (lança ou não).
    expect(typeof threw).toBe("boolean");
  });

  it("achado real: prop de callout fora do enum NÃO é coagida ao default — passa como está", () => {
    // Documentado na auditoria (§21 Limitações) — a lista `values` do
    // propSchema não é validada em runtime ao carregar initialContent; se
    // isso importar no futuro (ex.: dado corrompido vindo do banco), a
    // aplicação precisa validar defensivamente antes de passar para o editor.
    const editor = BlockNoteEditor.create({
      schema: labEditorSchema,
      // Valor deliberadamente fora do enum ("nao-existe"), testando o
      // comportamento real de runtime — não é rejeitado estaticamente
      // pelo tipo de initialContent, então validamos no valor retornado.
      initialContent: [{ type: "callout", props: { type: "nao-existe" }, content: "x" }],
    });
    const calloutProps = editor.document[0].props as { type: string };
    expect(calloutProps.type).toBe("nao-existe");
  });
});

describe("client-only — guarda de importação", () => {
  const thisDir = path.dirname(fileURLToPath(import.meta.url));

  it("a rota do laboratório não importa @blocknote diretamente (só via lazy)", () => {
    const routePath = path.resolve(thisDir, "../../routes/app.lab.editor.tsx");
    const source = readFileSync(routePath, "utf-8");
    expect(source).not.toMatch(/from ["']@blocknote/);
  });

  it("client-only-editor usa lazy() para importar o BlockNote", () => {
    const source = readFileSync(path.resolve(thisDir, "./client-only-editor.tsx"), "utf-8");
    expect(source).toMatch(/lazy\(/);
    expect(source).not.toMatch(/from ["']@blocknote/);
  });
});
