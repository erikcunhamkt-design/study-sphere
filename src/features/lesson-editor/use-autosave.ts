import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { deleteDraft, getDraft, saveDraft } from "./drafts-db";
import { validateLessonDocument, type LessonDocument } from "./document-schema";
import { useSaveLessonDocument } from "./hooks";
import { LessonDocumentConflictError } from "./types";

export type AutosaveStatus =
  "idle" | "editing" | "saving" | "saved" | "offline" | "erro" | "conflito";

// Plano §10.1 pede 1,5–2,5s de debounce após a última alteração (não a
// cada tecla).
const DEBOUNCE_MS = 1500;
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
 * Debounce após a última alteração. Antes de qualquer tentativa de rede,
 * grava um rascunho em IndexedDB — se a rede falhar ou a aba fechar, o
 * conteúdo digitado não se perde. Em conflito de versão (outra aba/
 * dispositivo salvou depois), NUNCA sobrescreve silenciosamente: para em
 * `conflito` e expõe os dados para a UI decidir.
 *
 * Gravações são serializadas: só uma chamada de rede por vez (save,
 * incluindo suas tentativas de retry) por instância deste hook. Se o
 * conteúdo mudar enquanto uma gravação está em voo, o conteúdo mais novo
 * fica pendente e é enviado assim que a gravação atual terminar — nunca
 * dispara uma segunda chamada concorrente, e o rascunho local só é
 * apagado quando não sobra nenhum conteúdo mais novo pendente.
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

  const inFlightRef = useRef(false);
  const pendingSaveRef = useRef<{ content: LessonDocument; schemaVersion: number } | null>(null);

  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );

  // Dono exclusivo da chamada de rede (e de suas retentativas) para um
  // conteúdo específico. Nunca chamado diretamente por quem usa o hook —
  // só por performSave (primeira tentativa) ou por si mesma (retry / envio
  // do conteúdo pendente).
  const attemptSave = useCallback(
    async (content: LessonDocument, schemaVersion: number, expectedVersionForSave: number) => {
      setStatus("saving");
      try {
        const result = await saveMutation.mutateAsync({
          content,
          schemaVersion,
          expectedVersion: expectedVersionForSave,
        });
        setExpectedVersion(result.version);
        setStatus("saved");
        retryCount.current = 0;

        const pending = pendingSaveRef.current;
        if (pending) {
          pendingSaveRef.current = null;
          void attemptSave(pending.content, pending.schemaVersion, result.version);
          return;
        }

        inFlightRef.current = false;
        if (user) await deleteDraft(user.id, lessonId);
      } catch (err) {
        if (err instanceof LessonDocumentConflictError) {
          inFlightRef.current = false;
          pendingSaveRef.current = null;
          setStatus("conflito");
          setConflict({
            attemptedContent: content,
            attemptedSchemaVersion: schemaVersion,
            expectedVersion: expectedVersionForSave,
          });
          return;
        }

        if (retryCount.current < MAX_RETRIES) {
          retryCount.current += 1;
          setStatus("offline");
          const backoffMs = 2 ** retryCount.current * 1000;
          // inFlightRef continua true durante a espera do retry: nenhuma
          // outra chamada de rede pode começar para este documento; se
          // chegar conteúdo novo nesse meio-tempo, ele só entra na fila
          // (pendingSaveRef), nunca dispara uma chamada concorrente.
          retryTimer.current = setTimeout(() => {
            void attemptSave(content, schemaVersion, expectedVersionForSave);
          }, backoffMs);
          return;
        }

        setStatus("erro");
        const pending = pendingSaveRef.current;
        if (pending) {
          pendingSaveRef.current = null;
          retryCount.current = 0;
          void attemptSave(pending.content, pending.schemaVersion, expectedVersionRef.current);
          return;
        }
        inFlightRef.current = false;
      }
    },
    [user, lessonId, saveMutation],
  );

  const performSave = useCallback(
    async (content: LessonDocument, schemaVersion: number, expectedVersionForSave: number) => {
      if (!user) return;

      const validation = validateLessonDocument(content);
      if (!validation.success) {
        // Defesa em profundidade: o schema restrito do editor não deveria
        // permitir isto, mas conteúdo estruturalmente inválido nunca vai
        // pra rede nem sobrescreve o rascunho local.
        console.error("[useLessonAutosave] conteúdo inválido, gravação cancelada", {
          issues: validation.error.issues,
        });
        setStatus("erro");
        return;
      }

      await saveDraft(user.id, lessonId, {
        content,
        schemaVersion,
        baseVersion: expectedVersionForSave,
        savedAt: new Date().toISOString(),
      });

      if (inFlightRef.current) {
        pendingSaveRef.current = { content, schemaVersion };
        return;
      }

      inFlightRef.current = true;
      retryCount.current = 0;
      await attemptSave(content, schemaVersion, expectedVersionForSave);
    },
    [user, lessonId, attemptSave],
  );

  const scheduleSave = useCallback(
    (content: LessonDocument, schemaVersion: number) => {
      setStatus("editing");
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        void performSave(content, schemaVersion, expectedVersionRef.current);
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
      // A versão a usar é passada explicitamente: não dá pra confiar no
      // ref aqui, porque setExpectedVersion só reflete no ref no próximo
      // render — se performSave lesse expectedVersionRef.current agora,
      // ainda veria o valor antigo e cairia no mesmo conflito de novo.
      await performSave(
        conflict.attemptedContent,
        conflict.attemptedSchemaVersion,
        newExpectedVersion,
      );
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

  return {
    status,
    expectedVersion,
    conflict,
    scheduleSave,
    resolveConflictKeepMine,
    resolveConflictDiscardMine,
    schemaVersion: initialSchemaVersion,
  };
}
