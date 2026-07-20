import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useAuth } from "@/hooks/use-auth";
import * as api from "../api/course-modules";
import type { CourseModule, CreateCourseModuleInput, UpdateCourseModuleInput } from "../types";
import {
  filterByArchiveState,
  nextActivePosition,
  REORDER_REJECTION_MESSAGES,
  sortByPosition,
  validateReorderIds,
} from "../utils";

export function courseModulesKey(userId: string | undefined, courseId: string | undefined) {
  return ["course-modules", userId, courseId] as const;
}

export function courseModuleKey(userId: string | undefined, moduleId: string | undefined) {
  return ["module", userId, moduleId] as const;
}

export function useCourseModules(courseId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!courseId,
    queryKey: courseModulesKey(user?.id, courseId),
    queryFn: () => api.fetchCourseModules(user!.id, courseId!),
  });
}

export function allCourseModulesKey(userId: string | undefined) {
  return ["all-course-modules", userId] as const;
}

/** Todos os módulos do usuário — usado para contagens agregadas (ex.: exclusão de área). */
export function useAllCourseModules() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: allCourseModulesKey(user?.id),
    queryFn: () => api.fetchAllCourseModules(user!.id),
  });
}

export function useCourseModule(moduleId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!moduleId,
    queryKey: courseModuleKey(user?.id, moduleId),
    queryFn: () => api.fetchCourseModule(user!.id, moduleId!),
  });
}

function useNextModulePosition(courseId: string | undefined) {
  const { data: modules } = useCourseModules(courseId);
  return useCallback(() => nextActivePosition(modules ?? []), [modules]);
}

function useInvalidateModuleQueries() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useCallback(
    (courseId: string | undefined, moduleId?: string) => {
      qc.invalidateQueries({ queryKey: courseModulesKey(user?.id, courseId) });
      if (moduleId) qc.invalidateQueries({ queryKey: courseModuleKey(user?.id, moduleId) });
    },
    [qc, user?.id],
  );
}

export function useCreateCourseModule(courseId: string) {
  const { user } = useAuth();
  const invalidate = useInvalidateModuleQueries();
  const nextPosition = useNextModulePosition(courseId);
  return useMutation({
    mutationFn: async (input: CreateCourseModuleInput) => {
      if (!user) throw new Error("Não autenticado");
      return api.createCourseModule(user.id, input, nextPosition());
    },
    onSuccess: () => invalidate(courseId),
  });
}

export function useUpdateCourseModule(courseId: string | undefined) {
  const invalidate = useInvalidateModuleQueries();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdateCourseModuleInput }) =>
      api.updateCourseModule(id, patch),
    onSuccess: (_data, variables) => invalidate(courseId, variables.id),
  });
}

export function useArchiveCourseModule(courseId: string | undefined) {
  const update = useUpdateCourseModule(courseId);
  return useCallback(
    (id: string) => update.mutateAsync({ id, patch: { is_archived: true } }),
    [update],
  );
}

/** Restaurar sempre coloca o módulo no final da lista ativa — nunca reaproveita a position anterior. */
export function useRestoreCourseModule(courseId: string | undefined) {
  const { data: modules } = useCourseModules(courseId);
  const update = useUpdateCourseModule(courseId);
  return useCallback(
    (id: string) =>
      update.mutateAsync({
        id,
        patch: { is_archived: false, position: nextActivePosition(modules ?? []) },
      }),
    [update, modules],
  );
}

export function useDeleteCourseModule(courseId: string | undefined) {
  const invalidate = useInvalidateModuleQueries();
  return useMutation({
    mutationFn: (id: string) => api.deleteCourseModule(id),
    onSuccess: () => invalidate(courseId),
  });
}

/**
 * Reordena com atualização otimista e validação de conjunto completo no
 * cliente (mesmo padrão de reorder_study_areas/reorder_courses — Fase
 * 02.1) — a RPC no banco continua sendo a única barreira real contra
 * requisições diretas.
 */
export function useReorderCourseModules(courseId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = courseModulesKey(user?.id, courseId);
  return useMutation({
    mutationFn: (orderedIds: string[]) => {
      const current = qc.getQueryData<CourseModule[]>(key) ?? [];
      const expectedIds = filterByArchiveState(current, "active").map((m) => m.id);
      const validation = validateReorderIds(orderedIds, expectedIds);
      if (!validation.valid) {
        throw new Error(REORDER_REJECTION_MESSAGES[validation.reason]);
      }
      return api.reorderCourseModules(courseId, orderedIds);
    },
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<CourseModule[]>(key);
      if (previous) {
        const byId = new Map(previous.map((m) => [m.id, m]));
        const reordered = orderedIds
          .map((id, index) => {
            const courseModule = byId.get(id);
            return courseModule ? { ...courseModule, position: index } : null;
          })
          .filter((m): m is CourseModule => m !== null);
        qc.setQueryData(key, sortByPosition(reordered));
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
