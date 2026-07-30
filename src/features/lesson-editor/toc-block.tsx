import type { Block } from "@blocknote/core";
import { createReactBlockSpec, useEditorChange } from "@blocknote/react";
import { ListTree } from "lucide-react";
import { useState } from "react";

/**
 * Índice (Fase 03.2): sumário automático do documento, calculado ao vivo
 * a partir dos títulos (H1–H3) do próprio caderno. Nada é persistido além
 * do tipo do bloco — o conteúdo é derivado na renderização, então nunca
 * fica dessincronizado do texto real. Clique navega até o título.
 */

interface HeadingEntry {
  id: string;
  level: 1 | 2 | 3;
  text: string;
}

function textOfBlock(block: Block): string {
  if (!Array.isArray(block.content)) return "";
  return block.content
    .map((item) => ("text" in item && typeof item.text === "string" ? item.text : ""))
    .join("");
}

function collectHeadings(blocks: Block[], out: HeadingEntry[]): HeadingEntry[] {
  for (const block of blocks) {
    if (block.type === "heading") {
      const level = Number((block.props as { level?: number }).level ?? 1);
      if (level >= 1 && level <= 3) {
        const text = textOfBlock(block).trim();
        if (text) out.push({ id: block.id, level: level as 1 | 2 | 3, text });
      }
    }
    if (block.children?.length) collectHeadings(block.children, out);
  }
  return out;
}

const INDENT_CLASS: Record<number, string> = {
  1: "pl-0",
  2: "pl-4",
  3: "pl-8",
};

type TocEditor = NonNullable<Parameters<typeof useEditorChange>[1]>;

function TocBlockView({ editor }: { editor: TocEditor }) {
  const [headings, setHeadings] = useState<HeadingEntry[]>(() =>
    collectHeadings(editor.document as unknown as Block[], []),
  );

  useEditorChange((ed) => {
    setHeadings(collectHeadings(ed.document as unknown as Block[], []));
  }, editor);

  function goTo(id: string) {
    const el = editor.domElement?.querySelector(`[data-id="${CSS.escape(id)}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    editor.setTextCursorPosition(id, "start");
  }

  return (
    <div className="my-1 w-full rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <ListTree className="h-4 w-4" aria-hidden />
        Índice
      </div>
      {headings.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Adicione títulos ao caderno para montar o índice automaticamente.
        </p>
      ) : (
        <nav aria-label="Índice do caderno">
          <ul className="space-y-1">
            {headings.map((h) => (
              <li key={h.id} className={INDENT_CLASS[h.level]}>
                <button
                  type="button"
                  onClick={() => goTo(h.id)}
                  className="text-left text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  {h.text}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

export const tocBlock = createReactBlockSpec(
  {
    type: "tableOfContents",
    propSchema: {},
    content: "none",
  },
  {
    render: ({ editor }) => <TocBlockView editor={editor} />,
  },
);
