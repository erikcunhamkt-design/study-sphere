import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import * as api from "./api";
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

export function studySessionsSinceKey(userId: string | undefined, sinceIso: string | undefined) {
  return ["study-sessions-since", userId, sinceIso] as const;
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

/** Para métricas (Fase 06) — sessões finalizadas numa janela, colunas mínimas. */
export function useStudySessionsSince(sinceIso: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!sinceIso,
    queryKey: studySessionsSinceKey(user?.id, sinceIso),
    queryFn: () => api.fetchStudySessionsSince(user!.id, sinceIso!),
  });
}

function useInvalidateStudySessionLists() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: inProgressStudySessionsKey(user?.id) });
    void qc.invalidateQueries({ queryKey: ["study-sessions-recent", user?.id] });
    void qc.invalidateQueries({ queryKey: ["study-sessions-seconds", user?.id] });
    void qc.invalidateQueries({ queryKey: ["study-sessions-since", user?.id] });
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

export function useFinishStudySession(sessionId: string, startedAtIso: string) {
  const invalidate = useInvalidateStudySessionLists();
  return useMutation({
    mutationFn: (details: StudySessionDetails) =>
      api.finishStudySession(sessionId, startedAtIso, details),
    onSuccess: invalidate,
  });
}

export function useDeleteStudySession() {
  const invalidate = useInvalidateStudySessionLists();
  return useMutation({
    mutationFn: (sessionId: string) => api.deleteStudySession(sessionId),
    onSuccess: invalidate,
  });
}
