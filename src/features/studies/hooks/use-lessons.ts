import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useAuth } from "@/hooks/use-auth";
import * as api from "../api/lessons";
import type { CreateLessonInput, Lesson, UpdateLessonInput } from "../types";
import {
  filterByArchiveState,
  nextActivePosition,
  REORDER_REJECTION_MESSAGES,
  sortByPosition,
  validateReorderIds,
} from "../utils";

export function lessonsByModuleKey(userId: string | undefined, moduleId: string | undefined) {
  return ["lessons", userId, moduleId] as const;
}

export function lessonsByCourseKey(userId: string | undefined, courseId: string | undefined) {
  return ["course-lessons", userId, courseId] as const;
}

export function lessonKey(userId: string | undefined, lessonId: string | undefined) {
  return ["lesson", userId, lessonId] as const;
}

export function useLessonsByModule(moduleId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!moduleId,
    queryKey: lessonsByModuleKey(user?.id, moduleId),
    queryFn: () => api.fetchLessonsByModule(user!.id, moduleId!),
  });
}

/** Todas as aulas do curso (qualquer módulo) — usada para o progresso do curso e a árvore. */
export function useLessonsByCourse(courseId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!courseId,
    queryKey: lessonsByCourseKey(user?.id, courseId),
    queryFn: () => api.fetchLessonsByCourse(user!.id, courseId!),
  });
}

export function allLessonsKey(userId: string | undefined) {
  return ["all-lessons", userId] as const;
}

/** Todas as aulas do usuário — usado para contagens agregadas (ex.: exclusão de área). */
export function useAllLessons() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: allLessonsKey(user?.id),
    queryFn: () => api.fetchAllLessons(user!.id),
  });
}

export function useLesson(lessonId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!lessonId,
    queryKey: lessonKey(user?.id, lessonId),
    queryFn: () => api.fetchLesson(user!.id, lessonId!),
  });
}

function useNextLessonPosition(moduleId: string | undefined) {
  const { data: lessons } = useLessonsByModule(moduleId);
  return useCallback(() => nextActivePosition(lessons ?? []), [lessons]);
}

function useInvalidateLessonQueries() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useCallback(
    (moduleId: string | undefined, courseId: string | undefined, lessonId?: string) => {
      qc.invalidateQueries({ queryKey: lessonsByModuleKey(user?.id, moduleId) });
      qc.invalidateQueries({ queryKey: lessonsByCourseKey(user?.id, courseId) });
      if (lessonId) qc.invalidateQueries({ queryKey: lessonKey(user?.id, lessonId) });
    },
    [qc, user?.id],
  );
}

export function useCreateLesson(moduleId: string, courseId: string) {
  const { user } = useAuth();
  const invalidate = useInvalidateLessonQueries();
  const nextPosition = useNextLessonPosition(moduleId);
  return useMutation({
    mutationFn: async (input: CreateLessonInput) => {
      if (!user) throw new Error("Não autenticado");
      return api.createLesson(user.id, input, nextPosition());
    },
    onSuccess: () => invalidate(moduleId, courseId),
  });
}

export function useUpdateLesson(moduleId: string | undefined, courseId: string | undefined) {
  const invalidate = useInvalidateLessonQueries();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdateLessonInput }) =>
      api.updateLesson(id, patch),
    onSuccess: (_data, variables) => invalidate(moduleId, courseId, variables.id),
  });
}

/** Atualização otimista: a UI marca/desmarca na hora, sem esperar o round-trip. */
export function useToggleLessonCompletion(
  moduleId: string | undefined,
  courseId: string | undefined,
) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const moduleKey = lessonsByModuleKey(user?.id, moduleId);
  const courseKey = lessonsByCourseKey(user?.id, courseId);

  const mutation = useMutation({
    mutationFn: ({ id, is_completed }: { id: string; is_completed: boolean }) =>
      api.updateLesson(id, { is_completed }),
    onMutate: async ({ id, is_completed }) => {
      await qc.cancelQueries({ queryKey: moduleKey });
      await qc.cancelQueries({ queryKey: courseKey });
      const previousModule = qc.getQueryData<Lesson[]>(moduleKey);
      const previousCourse = qc.getQueryData<Lesson[]>(courseKey);
      const patchList = (list: Lesson[] | undefined) =>
        list?.map((l) =>
          l.id === id
            ? { ...l, is_completed, completed_at: is_completed ? new Date().toISOString() : null }
            : l,
        );
      if (previousModule) qc.setQueryData(moduleKey, patchList(previousModule));
      if (previousCourse) qc.setQueryData(courseKey, patchList(previousCourse));
      return { previousModule, previousCourse };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousModule) qc.setQueryData(moduleKey, context.previousModule);
      if (context?.previousCourse) qc.setQueryData(courseKey, context.previousCourse);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: moduleKey });
      qc.invalidateQueries({ queryKey: courseKey });
    },
  });

  return useCallback(
    (lesson: Lesson) => mutation.mutateAsync({ id: lesson.id, is_completed: !lesson.is_completed }),
    [mutation],
  );
}

export function useArchiveLesson(moduleId: string | undefined, courseId: string | undefined) {
  const update = useUpdateLesson(moduleId, courseId);
  return useCallback(
    (id: string) => update.mutateAsync({ id, patch: { is_archived: true } }),
    [update],
  );
}

/** Restaurar sempre coloca a aula no final da lista ativa do módulo. */
export function useRestoreLesson(moduleId: string | undefined, courseId: string | undefined) {
  const { data: lessons } = useLessonsByModule(moduleId);
  const update = useUpdateLesson(moduleId, courseId);
  return useCallback(
    (id: string) =>
      update.mutateAsync({
        id,
        patch: { is_archived: false, position: nextActivePosition(lessons ?? []) },
      }),
    [update, lessons],
  );
}

export function useDeleteLesson(moduleId: string | undefined, courseId: string | undefined) {
  const invalidate = useInvalidateLessonQueries();
  return useMutation({
    mutationFn: (id: string) => api.deleteLesson(id),
    onSuccess: () => invalidate(moduleId, courseId),
  });
}

export function useReorderLessons(moduleId: string, courseId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = lessonsByModuleKey(user?.id, moduleId);
  const courseKey = lessonsByCourseKey(user?.id, courseId);
  return useMutation({
    mutationFn: (orderedIds: string[]) => {
      const current = qc.getQueryData<Lesson[]>(key) ?? [];
      const expectedIds = filterByArchiveState(current, "active").map((l) => l.id);
      const validation = validateReorderIds(orderedIds, expectedIds);
      if (!validation.valid) {
        throw new Error(REORDER_REJECTION_MESSAGES[validation.reason]);
      }
      return api.reorderLessons(moduleId, orderedIds);
    },
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Lesson[]>(key);
      if (previous) {
        const byId = new Map(previous.map((l) => [l.id, l]));
        const reordered = orderedIds
          .map((id, index) => {
            const lesson = byId.get(id);
            return lesson ? { ...lesson, position: index } : null;
          })
          .filter((l): l is Lesson => l !== null);
        qc.setQueryData(key, sortByPosition(reordered));
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: courseKey });
    },
  });
}
