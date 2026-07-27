import { filterSuggestionItems } from "@blocknote/core/extensions";
import { SuggestionMenuController, useCreateBlockNote, useEditorChange } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LabEditorFormattingToolbar } from "@/features/lab-editor/formatting-toolbar";
import { labEditorSchema } from "@/features/lab-editor/schema";
import { getLabEditorSlashMenuItems } from "@/features/lab-editor/slash-menu-items";
import "@/features/lab-editor/theme.css";
import { ConflictDialog } from "./conflict-dialog";
import type { LessonDocument } from "./document-schema";
import { deleteDraft, getDraft } from "./drafts-db";
import { HistoryPanel } from "./history-panel";
import { useLessonDocument } from "./hooks";
import { LessonEditorSideMenuController } from "./side-menu";
import { AutosaveStatusIndicator } from "./status-indicator";
import type { LessonDocumentRow } from "./types";
import { useLessonAutosave } from "./use-autosave";

const CURRENT_SCHEMA_VERSION = 1;

export function LessonEditor({ lessonId }: { lessonId: string }) {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const { data: doc, isLoading, isError } = useLessonDocument(lessonId);
  const [reloadNonce, setReloadNonce] = useState(0);

  if (isLoading) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Não foi possível carregar o caderno desta aula. Tente novamente em instantes.
      </p>
    );
  }

  return (
    <LessonEditorLoaded
      // A troca de chave só acontece quando o usuário pede explicitamente
      // para carregar a versão mais recente após um conflito (reloadNonce)
      // — nunca a cada autosave normal, senão o editor remontaria (e
      // perderia foco/cursor) a cada salvamento bem-sucedido.
      key={`${doc?.id ?? "new"}-${reloadNonce}`}
      lessonId={lessonId}
      document={doc}
      userId={user?.id}
      theme={resolvedTheme}
      onRequestReload={() => setReloadNonce((n) => n + 1)}
    />
  );
}

function LessonEditorLoaded({
  lessonId,
  document: doc,
  userId,
  theme,
  onRequestReload,
}: {
  lessonId: string;
  document: LessonDocumentRow | null | undefined;
  userId: string | undefined;
  theme: "light" | "dark";
  onRequestReload: () => void;
}) {
  const [draftBanner, setDraftBanner] = useState<LessonDocument | null>(null);
  const checkedDraftOnce = useRef(false);
  const initialVersion = doc?.version ?? 0;

  const autosave = useLessonAutosave({
    lessonId,
    initialVersion,
    initialSchemaVersion: CURRENT_SCHEMA_VERSION,
  });

  const hasInitialContent = !!doc?.content && doc.content.length > 0;
  const editor = useCreateBlockNote({
    schema: labEditorSchema,
    ...(hasInitialContent
      ? { initialContent: doc!.content as unknown as never }
      : {}),
  });

  useEditorChange((ed) => {
    autosave.scheduleSave(ed.document as unknown as LessonDocument, CURRENT_SCHEMA_VERSION);
  }, editor);

  // Verifica rascunho local uma única vez, ao montar. Só oferece
  // recuperação se o rascunho partiu exatamente da versão carregada agora
  // — um rascunho de versão anterior já foi superado por um save real
  // (outra aba/dispositivo) e é descartado, não aplicado silenciosamente.
  useEffect(() => {
    if (checkedDraftOnce.current || !userId) return;
    checkedDraftOnce.current = true;
    void (async () => {
      const draft = await getDraft(userId, lessonId);
      if (!draft) return;
      if (draft.baseVersion === initialVersion) {
        setDraftBanner(draft.content);
      } else {
        await deleteDraft(userId, lessonId);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, lessonId]);

  function applyDraft() {
    if (!draftBanner) return;
    editor.replaceBlocks(
      editor.document,
      draftBanner as unknown as Parameters<typeof editor.replaceBlocks>[1],
    );
    setDraftBanner(null);
    toast.success("Rascunho recuperado — revise e continue editando.");
  }

  async function discardDraftBanner() {
    setDraftBanner(null);
    if (userId) await deleteDraft(userId, lessonId);
  }

  async function handleLoadRemote() {
    await autosave.resolveConflictDiscardMine();
    onRequestReload();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AutosaveStatusIndicator status={autosave.status} />
        <HistoryPanel lessonId={lessonId} documentId={doc?.id} />
      </div>

      {draftBanner ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-400/50 bg-amber-50 px-3 py-2 text-sm dark:border-amber-400/30 dark:bg-amber-950/40">
          <span>Encontramos alterações não salvas de uma sessão anterior nesta aula.</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={discardDraftBanner}>
              Descartar
            </Button>
            <Button size="sm" onClick={applyDraft}>
              Recuperar
            </Button>
          </div>
        </div>
      ) : null}

      <div className="lab-editor-bn-theme rounded-xl border border-border bg-surface p-2 sm:p-4">
        <BlockNoteView
          editor={editor}
          theme={theme}
          formattingToolbar={false}
          slashMenu={false}
          sideMenu={false}
        >
          <LabEditorFormattingToolbar />
          <LessonEditorSideMenuController />
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
              filterSuggestionItems(getLabEditorSlashMenuItems(editor), query)
            }
          />
        </BlockNoteView>
      </div>

      <ConflictDialog
        open={!!autosave.conflict}
        remoteDocument={doc}
        onKeepMine={(remoteVersion) => void autosave.resolveConflictKeepMine(remoteVersion)}
        onLoadRemote={() => void handleLoadRemote()}
      />
    </div>
  );
}
