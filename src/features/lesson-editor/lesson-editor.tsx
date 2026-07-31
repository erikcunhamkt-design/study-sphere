import { filterSuggestionItems } from "@blocknote/core/extensions";
import { pt } from "@blocknote/core/locales";
import { SuggestionMenuController, useCreateBlockNote, useEditorChange } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LabEditorFormattingToolbar } from "@/features/lab-editor/formatting-toolbar";
import "@/features/lab-editor/theme.css";
import { FlashcardFormDialog } from "@/features/flashcards/flashcard-form-dialog";
import * as api from "./api";
import { ConflictDialog } from "./conflict-dialog";
import { validateLessonDocument, type LessonDocument } from "./document-schema";
import { deleteDraft, getDraft } from "./drafts-db";
import { FlashcardBridgeContext } from "./flashcard-bridge";
import { HistoryPanel } from "./history-panel";
import { useLessonDocument, useSaveLessonDocument } from "./hooks";
import { createMediaUploader, MediaValidationError, resolveMediaUrl } from "./media-upload";
import { lessonEditorSchema } from "./schema";
import { getLessonEditorSlashMenuItems } from "./slash-menu-items";
import { LessonEditorSideMenuController } from "./side-menu";
import { AutosaveStatusIndicator } from "./status-indicator";
import { watchLessonTabPresence } from "./tab-presence";
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

type LocalDraftState =
  { kind: "recoverable"; content: LessonDocument; isStale: boolean } | { kind: "invalid" } | null;

function InvalidRemoteDocument({
  lessonId,
  doc,
  issues,
}: {
  lessonId: string;
  doc: LessonDocumentRow;
  issues: string[];
}) {
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const saveMutation = useSaveLessonDocument(lessonId);

  async function handleDiscard() {
    setDiscarding(true);
    try {
      // Snapshot manual ANTES do save vazio: o snapshot automático pode
      // ser pulado dentro da janela de 5 minutos, e a promessa de que o
      // conteúdo anterior fica no histórico precisa valer sempre
      // (observação registrada na auditoria da Fase 03.1).
      await api.checkpointLessonDocument(lessonId);
      await saveMutation.mutateAsync({
        content: [],
        schemaVersion: CURRENT_SCHEMA_VERSION,
        expectedVersion: doc.version,
      });
      toast.success(
        "Caderno reiniciado — o conteúdo anterior ficou salvo no histórico de versões.",
      );
    } catch (err) {
      console.error("[lessonEditor] falha ao reiniciar documento inválido", err);
      toast.error("Não foi possível reiniciar o caderno. Tente novamente.");
    } finally {
      setDiscarding(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-destructive/50 bg-destructive/5 p-4">
      <p className="text-sm font-medium text-destructive">
        O conteúdo salvo desta aula está em um formato inesperado e não pode ser aberto com
        segurança.
      </p>
      <p className="text-sm text-muted-foreground">
        Isso evita abrir ou sobrescrever dados corrompidos sem você perceber. Você pode conferir o
        diagnóstico técnico ou reiniciar o caderno — o conteúdo atual continua preservado no
        histórico de versões.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowDiagnostic((v) => !v)}>
          {showDiagnostic ? "Ocultar diagnóstico" : "Ver diagnóstico"}
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDiscard} disabled={discarding}>
          Reiniciar caderno
        </Button>
      </div>
      {showDiagnostic ? (
        <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs">
          {issues.join("\n")}
        </pre>
      ) : null}
    </div>
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
  const [localDraft, setLocalDraft] = useState<LocalDraftState>(null);
  const [otherTabOpen, setOtherTabOpen] = useState(false);
  const [flashcardPrefill, setFlashcardPrefill] = useState<{
    lessonId: string | null;
    sourceBlockId: string | null;
    front: string;
  } | null>(null);
  const checkedDraftOnce = useRef(false);
  const initialVersion = doc?.version ?? 0;

  const autosave = useLessonAutosave({
    lessonId,
    initialVersion,
    initialSchemaVersion: CURRENT_SCHEMA_VERSION,
  });

  // Validação estrutural do documento remoto ANTES de confiar nele: nunca
  // passa conteúdo inválido para o BlockNote (poderia derrubar o editor) e
  // nunca troca silenciosamente por um documento vazio.
  const remoteValidation = useMemo(
    () => (doc?.content ? validateLessonDocument(doc.content) : null),
    [doc],
  );
  const isRemoteInvalid = !!remoteValidation && !remoteValidation.success;

  const hasInitialContent = !isRemoteInvalid && !!doc?.content && doc.content.length > 0;
  const editor = useCreateBlockNote({
    schema: lessonEditorSchema,
    // Textos internos do BlockNote (placeholders, painéis de mídia) em
    // português — pendência de i18n registrada na auditoria da Fase 03.2.
    dictionary: pt,
    // Upload validado por categoria (MIME + tamanho) antes da rede; o
    // documento guarda o caminho do storage, e resolveFileUrl troca por
    // URL assinada na exibição (o bucket é privado).
    uploadFile: async (file: File) => {
      if (!userId) throw new Error("Usuário não autenticado");
      try {
        return await createMediaUploader(userId, lessonId)(file);
      } catch (err) {
        if (err instanceof MediaValidationError) {
          toast.error(err.message);
        } else {
          toast.error("Não foi possível enviar o arquivo. Tente novamente.");
        }
        throw err;
      }
    },
    resolveFileUrl: resolveMediaUrl,
    ...(hasInitialContent ? { initialContent: doc!.content as unknown as never } : {}),
  });

  useEditorChange((ed) => {
    if (isRemoteInvalid) return;
    autosave.scheduleSave(ed.document as unknown as LessonDocument, CURRENT_SCHEMA_VERSION);
  }, editor);

  useEffect(() => {
    const handle = watchLessonTabPresence(lessonId, setOtherTabOpen);
    return () => handle.close();
  }, [lessonId]);

  // Verifica rascunho local uma única vez, ao montar. Valida a estrutura
  // (rascunho corrompido nunca é carregado) e a versão-base (rascunho de
  // versão antiga nunca é aplicado nem apagado sozinho — sempre uma
  // escolha explícita do usuário).
  useEffect(() => {
    if (checkedDraftOnce.current || !userId) return;
    checkedDraftOnce.current = true;
    void (async () => {
      const draft = await getDraft(userId, lessonId);
      if (!draft) return;

      const validation = validateLessonDocument(draft.content);
      if (!validation.success) {
        setLocalDraft({ kind: "invalid" });
        return;
      }

      setLocalDraft({
        kind: "recoverable",
        content: validation.data,
        isStale: draft.baseVersion !== initialVersion,
      });
    })();
  }, [userId, lessonId, initialVersion]);

  function applyLocalDraft() {
    if (localDraft?.kind !== "recoverable") return;
    editor.replaceBlocks(
      editor.document,
      localDraft.content as unknown as Parameters<typeof editor.replaceBlocks>[1],
    );
    setLocalDraft(null);
    toast.success("Rascunho recuperado — revise e continue editando.");
  }

  async function discardLocalDraftState() {
    setLocalDraft(null);
    if (userId) await deleteDraft(userId, lessonId);
  }

  async function handleLoadRemote() {
    await autosave.resolveConflictDiscardMine();
    onRequestReload();
  }

  if (isRemoteInvalid && doc) {
    const issues = !remoteValidation!.success
      ? remoteValidation!.error.issues.map(
          (issue) => `${issue.path.join(".") || "(raiz)"}: ${issue.message}`,
        )
      : [];
    return <InvalidRemoteDocument lessonId={lessonId} doc={doc} issues={issues} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <AutosaveStatusIndicator status={autosave.status} />
          {otherTabOpen ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <Users className="h-3.5 w-3.5" aria-hidden />
              Esta aula está aberta em outra aba
            </span>
          ) : null}
        </div>
        <HistoryPanel lessonId={lessonId} documentId={doc?.id} onRestored={onRequestReload} />
      </div>

      {localDraft ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-400/50 bg-amber-50 px-3 py-2 text-sm dark:border-amber-400/30 dark:bg-amber-950/40">
          <span>
            {localDraft.kind === "invalid"
              ? "Encontramos um rascunho local desta aula, mas o conteúdo dele está corrompido e não pode ser recuperado."
              : localDraft.isStale
                ? "Encontramos um rascunho local de uma versão anterior desta aula — o conteúdo salvo mudou desde então."
                : "Encontramos alterações não salvas de uma sessão anterior nesta aula."}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={discardLocalDraftState}>
              Descartar
            </Button>
            {localDraft.kind === "recoverable" ? (
              <Button size="sm" onClick={applyLocalDraft}>
                Recuperar
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="lab-editor-bn-theme rounded-xl border border-border bg-surface p-2 sm:p-4">
        <FlashcardBridgeContext.Provider
          value={{
            lessonId,
            onCreateFlashcard: ({ sourceBlockId, frontText }) =>
              setFlashcardPrefill({ lessonId, sourceBlockId, front: frontText }),
          }}
        >
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
                filterSuggestionItems(getLessonEditorSlashMenuItems(editor), query)
              }
            />
          </BlockNoteView>
        </FlashcardBridgeContext.Provider>
      </div>

      <ConflictDialog
        open={!!autosave.conflict}
        remoteDocument={doc}
        onKeepMine={(remoteVersion) => void autosave.resolveConflictKeepMine(remoteVersion)}
        onLoadRemote={() => void handleLoadRemote()}
      />

      <FlashcardFormDialog
        open={!!flashcardPrefill}
        onOpenChange={(open) => !open && setFlashcardPrefill(null)}
        prefill={flashcardPrefill ?? undefined}
      />
    </div>
  );
}
