import { filterSuggestionItems } from "@blocknote/core/extensions";
import { SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { useEffect } from "react";

import { useTheme } from "@/hooks/use-theme";
import { LabEditorFormattingToolbar } from "./formatting-toolbar";
import { LabEditorJsonInspector } from "./json-inspector";
import { sampleDocument } from "./sample-document";
import { labEditorSchema } from "./schema";
import { getLabEditorSlashMenuItems } from "./slash-menu-items";
import { LabEditorSideMenuController } from "./side-menu";
import "./theme.css";

/**
 * Componente do editor em si — só é montado no cliente (ver
 * blocknote-editor.client.tsx / rota do laboratório). Nunca importado
 * por nenhuma página real do produto.
 */
export function BlockNoteLab() {
  const { resolvedTheme } = useTheme();
  const editor = useCreateBlockNote({
    schema: labEditorSchema,
    initialContent: sampleDocument,
  });

  // Só existe em dev (a rota inteira é DEV-only) — hook de diagnóstico para
  // os testes desta prova (round trip, estabilidade de IDs, desempenho).
  // Não faz parte de nenhuma interface real do produto.
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as unknown as { __labEditor?: unknown }).__labEditor = editor;
    }
  }, [editor]);

  return (
    <div className="lab-editor-bn-theme rounded-xl border border-border bg-surface p-2 sm:p-4">
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme}
        formattingToolbar={false}
        slashMenu={false}
        sideMenu={false}
      >
        <LabEditorFormattingToolbar />
        <LabEditorSideMenuController />
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(getLabEditorSlashMenuItems(editor), query)
          }
        />
      </BlockNoteView>
      <LabEditorJsonInspector editor={editor} />
    </div>
  );
}
