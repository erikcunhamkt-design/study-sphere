import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useAuth } from "@/hooks/use-auth";
import * as api from "../api/study-areas";
import { useAllCourses } from "./use-courses";
import type {
  CreateStudyAreaInput,
  StudyArea,
  StudyAreaWithCounts,
  UpdateStudyAreaInput,
} from "../types";
import {
  filterByArchiveState,
  nextActivePosition,
  REORDER_REJECTION_MESSAGES,
  sortByPosition,
  validateReorderIds,
} from "../utils";

export function studyAreasKey(userId: string | undefined) {
  return ["study-areas", userId] as const;
}

export function studyAreaKey(userId: string | undefined, areaId: string | undefined) {
  return ["study-area", userId, areaId] as const;
}

export function useStudyAreas() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: studyAreasKey(user?.id),
    queryFn: () => api.fetchStudyAreas(user!.id),
  });
}

export function useStudyArea(areaId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!areaId,
    queryKey: studyAreaKey(user?.id, areaId),
    queryFn: () => api.fetchStudyArea(user!.id, areaId!),
  });
}

/** Áreas com contagem real de cursos (ativos) e de cursos em andamento. */
export function useStudyAreasWithCounts() {
  const areasQuery = useStudyAreas();
  const coursesQuery = useAllCourses();

  const data: StudyAreaWithCounts[] | undefined = areasQuery.data?.map((area) => {
    const areaCourses = (coursesQuery.data ?? []).filter(
      (c) => c.study_area_id === area.id && !c.is_archived,
    );
    return {
      ...area,
      courseCount: areaCourses.length,
      inProgressCount: areaCourses.filter((c) => c.status === "in_progress").length,
    };
  });

  return {
    data,
    isLoading: areasQuery.isLoading || coursesQuery.isLoading,
    isError: areasQuery.isError || coursesQuery.isError,
    error: areasQuery.error ?? coursesQuery.error,
  };
}

/** Próxima posição livre (fim da lista ativa) para uma nova área deste usuário. */
export function useNextStudyAreaPosition() {
  const { data: areas } = useStudyAreas();
  return useCallback(() => nextActivePosition(areas ?? []), [areas]);
}

export function useCreateStudyArea() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nextPosition = useNextStudyAreaPosition();
  return useMutation({
    mutationFn: async (input: CreateStudyAreaInput) => {
      if (!user) throw new Error("Não autenticado");
      return api.createStudyArea(user.id, input, nextPosition());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: studyAreasKey(user?.id) }),
  });
}

export function useUpdateStudyArea() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdateStudyAreaInput }) =>
      api.updateStudyArea(id, patch),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: studyAreasKey(user?.id) });
      qc.invalidateQueries({ queryKey: studyAreaKey(user?.id, variables.id) });
    },
  });
}

export function useArchiveStudyArea() {
  const update = useUpdateStudyArea();
  return useCallback(
    (id: string) => update.mutateAsync({ id, patch: { is_archived: true } }),
    [update],
  );
}

/** Restaurar sempre coloca o item no final da lista ativa — nunca reaproveita a position anterior. */
export function useRestoreStudyArea() {
  const { data: areas } = useStudyAreas();
  const update = useUpdateStudyArea();
  return useCallback(
    (id: string) =>
      update.mutateAsync({
        id,
        patch: { is_archived: false, position: nextActivePosition(areas ?? []) },
      }),
    [update, areas],
  );
}

export function useDeleteStudyArea() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteStudyArea(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: studyAreasKey(user?.id) }),
  });
}

/**
 * Reordena com atualização otimista: a lista muda na hora na tela, e só é
 * revertida (com toast de erro, tratado no componente) se o RPC falhar —
 * evita que o usuário perceba qualquer atraso de rede ao arrastar/mover.
 */
export function useReorderStudyAreas() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = studyAreasKey(user?.id);
  return useMutation({
    mutationFn: (orderedIds: string[]) => {
      const current = qc.getQueryData<StudyArea[]>(key) ?? [];
      const expectedIds = filterByArchiveState(current, "active").map((a) => a.id);
      const validation = validateReorderIds(orderedIds, expectedIds);
      if (!validation.valid) {
        throw new Error(REORDER_REJECTION_MESSAGES[validation.reason]);
      }
      return api.reorderStudyAreas(orderedIds);
    },
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<StudyArea[]>(key);
      if (previous) {
        const byId = new Map(previous.map((a) => [a.id, a]));
        const reordered = orderedIds
          .map((id, index) => {
            const area = byId.get(id);
            return area ? { ...area, position: index } : null;
          })
          .filter((a): a is StudyArea => a !== null);
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
