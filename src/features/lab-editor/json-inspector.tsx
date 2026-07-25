import type { BlockNoteEditor } from "@blocknote/core";
import { useEditorState } from "@blocknote/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { LabEditorSchema } from "./schema";

type LabEditor = BlockNoteEditor<
  LabEditorSchema["blockSchema"],
  LabEditorSchema["inlineContentSchema"],
  LabEditorSchema["styleSchema"]
>;

/**
 * Painel de diagnóstico — só existe no laboratório, nunca na interface
 * real do produto. Mostra o JSON nativo do documento (não HTML, não
 * Markdown) para validar contagem/IDs/tipos/tamanho serializado.
 *
 * Recebe `editor` explicitamente em vez de usar useBlockNoteEditor() —
 * fica fora do <BlockNoteView>, que é quem fornece o BlockNoteContext.
 */
export function LabEditorJsonInspector({ editor }: { editor: LabEditor }) {
  const [open, setOpen] = useState(false);
  const document = useEditorState({
    editor,
    selector: (snapshot) => snapshot.editor?.document ?? [],
  });

  const json = JSON.stringify(document, null, 2);
  const byteSize = new Blob([json]).size;

  function collectIds(blocks: typeof document, acc: { id: string; type: string }[] = []) {
    for (const block of blocks) {
      acc.push({ id: block.id, type: block.type });
      if (block.children?.length) collectIds(block.children, acc);
    }
    return acc;
  }
  const flatBlocks = collectIds(document);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="mt-6 rounded-xl border border-dashed border-border bg-surface/40"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 p-3 text-left text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={open}
        >
          <span>
            Diagnóstico JSON (laboratório) — {flatBlocks.length} bloco(s), ~{byteSize} bytes
          </span>
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 border-t border-border p-3">
        <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
          <span>
            Blocos (nível topo + aninhados):{" "}
            <strong className="text-foreground">{flatBlocks.length}</strong>
          </span>
          <span>
            Tamanho serializado: <strong className="text-foreground">{byteSize} bytes</strong>
          </span>
          <span>
            Editável:{" "}
            <strong className="text-foreground">{editor.isEditable ? "sim" : "não"}</strong>
          </span>
        </div>
        <div className="max-h-40 overflow-auto rounded-md border border-border bg-background p-2">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-left font-medium">ID</th>
                <th className="text-left font-medium">Tipo</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {flatBlocks.map((b) => (
                <tr key={b.id}>
                  <td className="pr-3 text-foreground">{b.id}</td>
                  <td className="text-muted-foreground">{b.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <pre className="max-h-64 overflow-auto rounded-md border border-border bg-background p-2 text-[11px] leading-relaxed text-foreground">
          {json}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}
