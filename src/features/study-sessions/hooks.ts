import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import * as api from "./api";
import { linkSessionAndComplete } from "@/features/planned-studies/api";
import type { StudySessionDetails } from "./types";

export function inProgressStudySessionsKey(userId: string | undefined) {
  return ["study-sessions-in-progress", userId] as const;
}

export function recentStudySessionsKey(userId: string | undefined, limit: number) {
  return ["study-sessions-recent", userId, limit] as const;
}

export function studySessionSecondsKey(userId: string | undefined, sinceIso: string | undefined) {
  return ["study-sessions-seconds", userId, sinceIso] as const;
}

export function useInProgressStudySessions() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: inProgressStudySessionsKey(user?.id),
    queryFn: () => api.fetchInProgressStudySessions(user!.id),
  });
}

export function useRecentStudySessions(limit: number) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: recentStudySessionsKey(user?.id, limit),
    queryFn: () => api.fetchRecentStudySessions(user!.id, limit),
  });
}

/** sinceIso fixo por render (não `new Date()` direto) evita refazer a query a cada rerender. */
export function useStudySessionSecondsSince(sinceIso: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!sinceIso,
    queryKey: studySessionSecondsKey(user?.id, sinceIso),
    queryFn: () => api.fetchStudySessionSecondsSince(user!.id, sinceIso!),
  });
}

function useInvalidateStudySessionLists() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: inProgressStudySessionsKey(user?.id) });
    void qc.invalidateQueries({ queryKey: ["study-sessions-recent", user?.id] });
    void qc.invalidateQueries({ queryKey: ["study-sessions-seconds", user?.id] });
  };
}

export function useCreateStudySession() {
  const { user } = useAuth();
  const invalidate = useInvalidateStudySessionLists();
  return useMutation({
    mutationFn: (input: api.CreateStudySessionInput) => api.createStudySession(user!.id, input),
    onSuccess: invalidate,
  });
}

export function useFinishStudySession(
  sessionId: string,
  startedAtIso: string,
  plannedId?: string,
) {
  const invalidate = useInvalidateStudySessionLists();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (details: StudySessionDetails) =>
      api.finishStudySession(sessionId, startedAtIso, details),
    onSuccess: async (session) => {
      invalidate();
      // Vínculo com o planejamento (Fase 06.2, Opção A): só quando veio de um
      // planejamento (plannedId) e a sessão realmente finalizou (estamos no
      // onSuccess do finish). Falha aqui NÃO desfaz o finish — o usuário pode
      // concluir o planejamento manualmente pelo DaySheet (rede de segurança).
      if (plannedId) {
        try {
          await linkSessionAndComplete(plannedId, session.id);
          void qc.invalidateQueries({ queryKey: ["planned-studies-range"] });
        } catch (err) {
          console.error("[planned-studies] falha ao vincular sessão ao planejamento", err);
        }
      }
    },
  });
}

export function useDeleteStudySession() {
  const invalidate = useInvalidateStudySessionLists();
  return useMutation({
    mutationFn: (sessionId: string) => api.deleteStudySession(sessionId),
    onSuccess: invalidate,
  });
}

export function useRecordRecallAttempt() {
  const invalidate = useInvalidateStudySessionLists();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: api.RecordRecallAttemptInput) => api.recordRecallAttempt(input),
    onSuccess: (evidenceId, variables) => {
      invalidate();
      // Invalida especificamente o estado de memória se houver conceito
      void qc.invalidateQueries({ queryKey: ["memory-state"] });
    },
  });
}

export function useMemoryState(conceptId: string | undefined) {
  return useQuery({
    enabled: !!conceptId,
    queryKey: ["memory-state", conceptId],
    queryFn: () => api.getMemoryState(conceptId!),
  });
}



