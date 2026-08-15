import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import * as api from "./api";
import type { LessonDocument } from "./document-schema";
import { LessonDocumentConflictError } from "./types";

export function lessonDocumentKey(userId: string | undefined, lessonId: string | undefined) {
  return ["lesson-document", userId, lessonId] as const;
}

export function lessonDocumentVersionsKey(
  userId: string | undefined,
  documentId: string | undefined,
) {
  return ["lesson-document-versions", userId, documentId] as const;
}

export function useLessonDocument(lessonId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!lessonId,
    queryKey: lessonDocumentKey(user?.id, lessonId),
    queryFn: () => api.fetchLessonDocument(user!.id, lessonId!),
  });
}

export function useLessonDocumentVersions(documentId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!documentId,
    queryKey: lessonDocumentVersionsKey(user?.id, documentId),
    queryFn: () => api.fetchLessonDocumentVersions(user!.id, documentId!),
  });
}

/**
 * Salva o documento com o número de versão esperado no momento da chamada.
 * Em conflito (LessonDocumentConflictError), NÃO reinvalida silenciosamente
 * — quem chama decide o que fazer (ver useAutosaveLessonDocument).
 */
export function useSaveLessonDocument(lessonId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      content,
      schemaVersion,
      expectedVersion,
    }: {
      content: LessonDocument;
      schemaVersion: number;
      expectedVersion: number;
    }) => api.saveLessonDocument(lessonId, content, schemaVersion, expectedVersion),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: lessonDocumentKey(user?.id, lessonId) });
      if (result.snapshot_created) {
        qc.invalidateQueries({
          queryKey: lessonDocumentVersionsKey(user?.id, result.document_id),
        });
      }
    },
    onError: (err) => {
      if (err instanceof LessonDocumentConflictError) {
        // A versão remota avançou; a UI de conflito decide (ver Etapa de
        // conflito), não tentamos de novo silenciosamente aqui.
        qc.invalidateQueries({ queryKey: lessonDocumentKey(user?.id, lessonId) });
      }
    },
  });
}

export function useCheckpointLessonDocument(lessonId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.checkpointLessonDocument(lessonId),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: lessonDocumentKey(user?.id, lessonId) });
      qc.invalidateQueries({ queryKey: lessonDocumentVersionsKey(user?.id, result.document_id) });
    },
  });
}

export function useRestoreLessonDocumentVersion(lessonId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (version: number) => api.restoreLessonDocumentVersion(lessonId, version),
    // Retorna as invalidações para que mutateAsync só resolva depois que o
    // documento restaurado foi re-buscado — quem remonta o editor no
    // sucesso (HistoryPanel.onRestored) precisa encontrar o conteúdo novo
    // no cache, não o antigo.
    onSuccess: (result) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: lessonDocumentKey(user?.id, lessonId) }),
        qc.invalidateQueries({ queryKey: lessonDocumentVersionsKey(user?.id, result.document_id) }),
      ]),
  });
}

export function usePublishLessonDocument(lessonId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.publishLessonDocument(lessonId),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: lessonDocumentKey(user?.id, lessonId) });
      qc.invalidateQueries({
        queryKey: lessonDocumentVersionsKey(user?.id, result.document_id),
      });
    },
  });
}
