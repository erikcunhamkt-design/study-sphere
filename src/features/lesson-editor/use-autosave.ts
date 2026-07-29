import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { deleteDraft, getDraft, saveDraft } from "./drafts-db";
import type { LessonDocument } from "./document-schema";
import { useSaveLessonDocument } from "./hooks";
import { LessonDocumentConflictError } from "./types";

export type AutosaveStatus =
  "idle" | "editing" | "saving" | "saved" | "offline" | "erro" | "conflito";

const DEBOUNCE_MS = 1000;
const MAX_RETRIES = 3;

export interface ConflictInfo {
  attemptedContent: LessonDocument;
  attemptedSchemaVersion: number;
  expectedVersion: number;
}

interface UseLessonAutosaveOptions {
  lessonId: string;
  initialVersion: number;
  initialSchemaVersion: number;
}

/**
 * Debounce ~1s após a última alteração, não a cada tecla. Antes de
 * qualquer tentativa de rede, grava um rascunho em IndexedDB — se a rede
 * falhar ou a aba fechar, o conteúdo digitado não se perde. Em conflito de
 * versão (outra aba/dispositivo salvou depois), NUNCA sobrescreve
 * silenciosamente: para em `conflito` e expõe os dados para a UI decidir.
 */
export function useLessonAutosave({
  lessonId,
  initialVersion,
  initialSchemaVersion,
}: UseLessonAutosaveOptions) {
  const { user } = useAuth();
  const saveMutation = useSaveLessonDocument(lessonId);

  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [expectedVersion, setExpectedVersion] = useState(initialVersion);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const expectedVersionRef = useRef(initialVersion);
  expectedVersionRef.current = expectedVersion;

  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );

  const performSave = useCallback(
    async (content: LessonDocument, schemaVersion: number) => {
      if (!user) return;

      await saveDraft(user.id, lessonId, {
        content,
        schemaVersion,
        baseVersion: expectedVersionRef.current,
        savedAt: new Date().toISOString(),
      });

      setStatus("saving");
      try {
        const result = await saveMutation.mutateAsync({
          content,
          schemaVersion,
          expectedVersion: expectedVersionRef.current,
        });
        setExpectedVersion(result.version);
        setStatus("saved");
        retryCount.current = 0;
        await deleteDraft(user.id, lessonId);
      } catch (err) {
        if (err instanceof LessonDocumentConflictError) {
          setStatus("conflito");
          setConflict({
            attemptedContent: content,
            attemptedSchemaVersion: schemaVersion,
            expectedVersion: expectedVersionRef.current,
          });
          return;
        }

        if (retryCount.current < MAX_RETRIES) {
          retryCount.current += 1;
          setStatus("offline");
          const backoffMs = 2 ** retryCount.current * 1000;
          retryTimer.current = setTimeout(() => {
            void performSave(content, schemaVersion);
          }, backoffMs);
        } else {
          setStatus("erro");
        }
      }
    },
    [user, lessonId, saveMutation],
  );

  const scheduleSave = useCallback(
    (content: LessonDocument, schemaVersion: number) => {
      setStatus("editing");
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryCount.current = 0;
      debounceTimer.current = setTimeout(() => {
        void performSave(content, schemaVersion);
      }, DEBOUNCE_MS);
    },
    [performSave],
  );

  /** Chamado quando o usuário resolve o conflito escolhendo manter a própria versão. */
  const resolveConflictKeepMine = useCallback(
    async (newExpectedVersion: number) => {
      if (!conflict) return;
      setExpectedVersion(newExpectedVersion);
      setConflict(null);
      await performSave(conflict.attemptedContent, conflict.attemptedSchemaVersion);
    },
    [conflict, performSave],
  );

  /** Chamado quando o usuário resolve o conflito descartando a própria versão. */
  const resolveConflictDiscardMine = useCallback(async () => {
    if (!user) return;
    setConflict(null);
    setStatus("idle");
    await deleteDraft(user.id, lessonId);
  }, [user, lessonId]);

  const checkForLocalDraft = useCallback(async () => {
    if (!user) return null;
    const draft = await getDraft(user.id, lessonId);
    if (!draft) return null;
    // Só é relevante recuperar se o rascunho local partiu da MESMA versão
    // que o servidor tem agora (ou de uma anterior) — se o servidor já
    // avançou além disso, é o mesmo caso de conflito, tratado à parte.
    return draft;
  }, [user, lessonId]);

  const discardLocalDraft = useCallback(async () => {
    if (!user) return;
    await deleteDraft(user.id, lessonId);
  }, [user, lessonId]);

  return {
    status,
    expectedVersion,
    conflict,
    scheduleSave,
    resolveConflictKeepMine,
    resolveConflictDiscardMine,
    checkForLocalDraft,
    discardLocalDraft,
    schemaVersion: initialSchemaVersion,
  };
}
