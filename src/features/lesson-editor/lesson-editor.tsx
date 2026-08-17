import { filterSuggestionItems } from "@blocknote/core/extensions";
import { pt } from "@blocknote/core/locales";
import { SuggestionMenuController, useCreateBlockNote, useEditorChange } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { Users, Loader2, CheckCircle2, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LabEditorFormattingToolbar } from "@/features/lab-editor/formatting-toolbar";
import { cn } from "@/lib/utils";
import "@/features/lab-editor/theme.css";
import { FlashcardFormDialog } from "@/features/flashcards/flashcard-form-dialog";
import { FlashcardList } from "@/features/flashcards/flashcard-list";
import { useFlashcards } from "@/features/flashcards/hooks";
import { QuestionFormDialog } from "@/features/questions/question-form-dialog";
import { QuestionList } from "@/features/questions/question-list";
import { useQuestions } from "@/features/questions/hooks";
import type { FlashcardContent } from "@/features/flashcards/schema";
import * as api from "./api";
import { ConflictDialog } from "./conflict-dialog";
import { anchorKey, type DocumentAnchor } from "./document-anchor";
import { validateLessonDocument, type LessonDocument } from "./document-schema";
import { deleteDraft, getDraft } from "./drafts-db";
import { FlashcardBridgeContext } from "./flashcard-bridge";
import { HistoryPanel } from "./history-panel";
import { useLessonDocument, useSaveLessonDocument, usePublishLessonDocument } from "./hooks";
import { createMediaUploader, MediaValidationError, resolveMediaUrl } from "./media-upload";
import { lessonEditorSchema } from "./schema";
import { getLessonEditorSlashMenuItems } from "./slash-menu-items";
import { LessonEditorSideMenuController } from "./side-menu";
import { AutosaveStatusIndicator } from "./status-indicator";
import { watchLessonTabPresence } from "./tab-presence";
import type { LessonDocumentRow } from "./types";
import { useLessonAutosave } from "./use-autosave";

const CURRENT_SCHEMA_VERSION = 1;

export function LessonEditor({ anchor }: { anchor: DocumentAnchor }) {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const { data: doc, isLoading, isError } = useLessonDocument(anchor);
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
        Não foi possível carregar este conteúdo. Tente novamente em instantes.
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
      anchor={anchor}
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
  anchor,
  doc,
  issues,
}: {
  anchor: DocumentAnchor;
  doc: LessonDocumentRow;
  issues: string[];
}) {
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const saveMutation = useSaveLessonDocument(anchor);

  async function handleDiscard() {
    setDiscarding(true);
    try {
      // Snapshot manual ANTES do save vazio: o snapshot automático pode
      // ser pulado dentro da janela de 5 minutos, e a promessa de que o
      // conteúdo anterior fica no histórico precisa valer sempre
      // (observação registrada na auditoria da Fase 03.1).
      await api.checkpointLessonDocument(anchor);
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
        O conteúdo salvo aqui está em um formato inesperado e não pode ser aberto com segurança.
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
  anchor,
  document: doc,
  userId,
  theme,
  onRequestReload,
}: {
  anchor: DocumentAnchor;
  document: LessonDocumentRow | null | undefined;
  userId: string | undefined;
  theme: "light" | "dark";
  onRequestReload: () => void;
}) {
  const contextKey = anchorKey(anchor);
  const [localDraft, setLocalDraft] = useState<LocalDraftState>(null);
  const [otherTabOpen, setOtherTabOpen] = useState(false);
  const [flashcardPrefill, setFlashcardPrefill] = useState<{
    lessonId: string | null;
    sourceBlockId: string | null;
    front: string;
    frontContent: FlashcardContent | null;
  } | null>(null);
  const [creatingQuestion, setCreatingQuestion] = useState(false);
  const checkedDraftOnce = useRef(false);
  const initialVersion = doc?.version ?? 0;

  const autosave = useLessonAutosave({
    anchor,
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
    // Em modo curso (sem lessonId), o placeholder do bloco vazio troca o
    // genérico "Digite texto ou use '/'..." por um convite mais direto —
    // não existe "estudante" lendo, é o autor sozinho com a página em branco.
    dictionary: anchor.lessonId
      ? pt
      : {
          ...pt,
          placeholders: { ...pt.placeholders, default: "Comece escrevendo…" },
        },
    // Upload validado por categoria (MIME + tamanho) antes da rede; o
    // documento guarda o caminho do storage, e resolveFileUrl troca por
    // URL assinada na exibição (o bucket é privado).
    uploadFile: async (file: File) => {
      if (!userId) throw new Error("Usuário não autenticado");
      try {
        return await createMediaUploader(userId, contextKey)(file);
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
    const handle = watchLessonTabPresence(contextKey, setOtherTabOpen);
    return () => handle.close();
  }, [contextKey]);

  // Verifica rascunho local uma única vez, ao montar. Valida a estrutura
  // (rascunho corrompido nunca é carregado) e a versão-base (rascunho de
  // versão antiga nunca é aplicado nem apagado sozinho — sempre uma
  // escolha explícita do usuário).
  useEffect(() => {
    if (checkedDraftOnce.current || !userId) return;
    checkedDraftOnce.current = true;
    void (async () => {
      const draft = await getDraft(userId, contextKey);
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
  }, [userId, contextKey, initialVersion]);

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
    if (userId) await deleteDraft(userId, contextKey);
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
    return <InvalidRemoteDocument anchor={anchor} doc={doc} issues={issues} />;
  }

  // Em modo aula, o editor divide a tela com as abas Flashcards/Questões —
  // o card (borda + fundo) ajuda a demarcar onde uma seção termina e outra
  // começa. Em modo curso não existe mais nada na página: o mesmo card, ali
  // sozinho, lê como "uma caixinha perdida no meio do vazio". Sem anchor
  // de aula, o texto flui direto na página — sem borda, sem fundo próprio.
  const editorWrapperClassName = anchor.lessonId
    ? "lab-editor-bn-theme rounded-xl border border-border bg-surface p-2 sm:p-4"
    : "lab-editor-bn-theme";

  const editorBlock = (
    <div className={editorWrapperClassName}>
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
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <AutosaveStatusIndicator
            status={autosave.status}
            onRetry={() =>
              void autosave.retryNow(
                editor.document as unknown as LessonDocument,
                CURRENT_SCHEMA_VERSION,
              )
            }
          />
          {otherTabOpen ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <Users className="h-3.5 w-3.5" aria-hidden />
              Este conteúdo está aberto em outra aba
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {/* Publicar distingue rascunho do que "os estudantes veem" — um
              conceito de audiência que não existe na escrita livre de um
              curso (ninguém além do autor lê aquele conteúdo). */}
          {anchor.lessonId ? <PublishButton anchor={anchor} doc={doc} /> : null}
          <HistoryPanel anchor={anchor} documentId={doc?.id} onRestored={onRequestReload} />
        </div>
      </div>

      {localDraft ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-400/50 bg-amber-50 px-3 py-2 text-sm dark:border-amber-400/30 dark:bg-amber-950/40">
          <span>
            {localDraft.kind === "invalid"
              ? "Encontramos um rascunho local deste conteúdo, mas ele está corrompido e não pode ser recuperado."
              : localDraft.isStale
                ? "Encontramos um rascunho local de uma versão anterior deste conteúdo — o conteúdo salvo mudou desde então."
                : "Encontramos alterações não salvas de uma sessão anterior aqui."}
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

      {anchor.lessonId ? (
        <LessonWorkspaceTabs
          lessonId={anchor.lessonId}
          editorBlock={editorBlock}
          onCreateFlashcard={(prefill) => setFlashcardPrefill(prefill)}
          onNewFlashcard={(lessonId) =>
            setFlashcardPrefill({ lessonId, sourceBlockId: null, front: "", frontContent: null })
          }
          onNewQuestion={() => setCreatingQuestion(true)}
        />
      ) : (
        editorBlock
      )}

      <ConflictDialog
        open={!!autosave.conflict}
        remoteDocument={doc}
        onKeepMine={(remoteVersion) => void autosave.resolveConflictKeepMine(remoteVersion)}
        onLoadRemote={() => void handleLoadRemote()}
      />

      {anchor.lessonId ? (
        <>
          <FlashcardFormDialog
            open={!!flashcardPrefill}
            onOpenChange={(open) => !open && setFlashcardPrefill(null)}
            prefill={flashcardPrefill ?? undefined}
          />

          <QuestionFormDialog
            open={creatingQuestion}
            onOpenChange={setCreatingQuestion}
            prefill={{ lessonId: anchor.lessonId }}
          />
        </>
      ) : null}
    </div>
  );
}

/**
 * Só existe em modo aula (anchor.lessonId): agrupa Conteúdo/Flashcards/
 * Questões, que dependem de um lessonId real (FK de flashcards/questions).
 * A escrita livre de um curso nunca chega aqui — não tem para onde essas
 * abas apontarem.
 */
function LessonWorkspaceTabs({
  lessonId,
  editorBlock,
  onCreateFlashcard,
  onNewFlashcard,
  onNewQuestion,
}: {
  lessonId: string;
  editorBlock: React.ReactNode;
  onCreateFlashcard: (prefill: {
    lessonId: string;
    sourceBlockId: string;
    front: string;
    frontContent: FlashcardContent | null;
  }) => void;
  onNewFlashcard: (lessonId: string) => void;
  onNewQuestion: () => void;
}) {
  return (
    <Tabs defaultValue="conteudo" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
        <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
        <TabsTrigger value="questoes">Questões</TabsTrigger>
      </TabsList>

      <TabsContent value="conteudo" className="mt-4 space-y-3">
        <FlashcardBridgeContext.Provider
          value={{
            lessonId,
            onCreateFlashcard: ({ sourceBlockId, frontText, frontContent }) =>
              onCreateFlashcard({ lessonId, sourceBlockId, front: frontText, frontContent }),
          }}
        >
          {editorBlock}
        </FlashcardBridgeContext.Provider>
      </TabsContent>

      <TabsContent value="flashcards" className="mt-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Flashcards da Aula</h3>
            <Button size="sm" onClick={() => onNewFlashcard(lessonId)}>
              Novo Cartão
            </Button>
          </div>
          <LessonFlashcardList lessonId={lessonId} />
        </div>
      </TabsContent>

      <TabsContent value="questoes" className="mt-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Questões da Aula</h3>
            <Button size="sm" onClick={onNewQuestion}>
              Nova Questão
            </Button>
          </div>
          <LessonQuestionList lessonId={lessonId} />
        </div>
      </TabsContent>
    </Tabs>
  );
}

function LessonFlashcardList({ lessonId }: { lessonId: string }) {
  const { data: cards, isLoading } = useFlashcards();
  const lessonCards = useMemo(
    () => cards?.filter((c) => c.lesson_id === lessonId) ?? [],
    [cards, lessonId],
  );

  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (lessonCards.length === 0)
    return (
      <p className="text-xs text-muted-foreground text-center py-8">
        Nenhum cartão para esta aula.
      </p>
    );

  return <FlashcardList cards={lessonCards} />;
}

function LessonQuestionList({ lessonId }: { lessonId: string }) {
  const { data: questions, isLoading } = useQuestions();
  const lessonQuestions = useMemo(
    () => questions?.filter((q) => q.lesson_id === lessonId) ?? [],
    [questions, lessonId],
  );

  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (lessonQuestions.length === 0)
    return (
      <p className="text-xs text-muted-foreground text-center py-8">
        Nenhuma questão para esta aula.
      </p>
    );

  return <QuestionList questions={lessonQuestions} />;
}

function PublishButton({
  anchor,
  doc,
}: {
  anchor: DocumentAnchor;
  doc: LessonDocumentRow | null | undefined;
}) {
  const publish = usePublishLessonDocument(anchor);

  const isUpToDate = doc && doc.published_version === doc.version;
  const hasContent = doc && doc.content && doc.content.length > 0;

  // Validação: Pelo menos um bloco real com conteúdo (Gate 1 - Etapa 4)
  const hasRealContent = useMemo(() => {
    if (!doc?.content || !Array.isArray(doc.content)) return false;
    return doc.content.some((block: any) => {
      if (block.type === "paragraph" && block.content && block.content.length > 0) return true;
      if (block.type !== "paragraph") return true; // Imagens, títulos, etc.
      return false;
    });
  }, [doc?.content]);

  const handlePublish = async () => {
    if (!hasRealContent) {
      toast.error(
        "Não é possível publicar: adicione pelo menos um conteúdo real antes de publicar esta aula.",
      );
      return;
    }

    try {
      await publish.mutateAsync();
      toast.success("Conteúdo publicado com sucesso! Estudantes já podem acessá-lo.");
    } catch (err) {
      console.error("[lessonEditor] falha ao publicar", err);
      toast.error("Não foi possível publicar o conteúdo.");
    }
  };

  if (!doc) return null;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        size="sm"
        variant={isUpToDate ? "outline" : "default"}
        disabled={publish.isPending || isUpToDate || !hasContent}
        onClick={handlePublish}
        className={cn(
          "h-8 px-3 text-[10px] font-black uppercase tracking-widest transition-all",
          !isUpToDate &&
            hasContent &&
            "bg-primary hover:bg-primary/90 text-white shadow-[0_0_15px_-3px_rgba(217,0,110,0.4)]",
        )}
      >
        {publish.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
        ) : isUpToDate ? (
          <CheckCircle2 className="h-3 w-3 mr-1.5 text-emerald-500" />
        ) : (
          <Zap className="h-3 w-3 mr-1.5" />
        )}
        {isUpToDate ? "Publicado" : "Publicar Alterações"}
      </Button>

      <p className="text-[9px] font-bold tracking-tight uppercase">
        {isUpToDate ? (
          <span className="text-emerald-500/60">
            Publicado em{" "}
            {doc.published_at
              ? new Date(doc.published_at).toLocaleString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </span>
        ) : doc.published_version ? (
          <span className="text-amber-500/60">
            Alterações não publicadas (Alunos vêem v{doc.published_version})
          </span>
        ) : (
          <span className="text-muted-foreground/40 text-[8px]">
            Aguardando primeira publicação
          </span>
        )}
      </p>
    </div>
  );
}
