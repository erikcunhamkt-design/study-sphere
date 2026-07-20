import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useAuth } from "@/hooks/use-auth";
import * as api from "../api/courses";
import type { Course, CreateCourseInput, UpdateCourseInput } from "../types";
import {
  filterByArchiveState,
  nextActivePosition,
  REORDER_REJECTION_MESSAGES,
  sortByPosition,
  validateReorderIds,
} from "../utils";

export function coursesByAreaKey(userId: string | undefined, areaId: string | undefined) {
  return ["courses", userId, areaId] as const;
}

export function allCoursesKey(userId: string | undefined) {
  return ["all-courses", userId] as const;
}

export function courseKey(userId: string | undefined, courseId: string | undefined) {
  return ["course", userId, courseId] as const;
}

export function useCoursesByArea(areaId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!areaId,
    queryKey: coursesByAreaKey(user?.id, areaId),
    queryFn: () => api.fetchCoursesByArea(user!.id, areaId!),
  });
}

/** Todos os cursos do usuário — usado para o dashboard e para contagens por área. */
export function useAllCourses() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: allCoursesKey(user?.id),
    queryFn: () => api.fetchAllCourses(user!.id),
  });
}

export function useCourse(courseId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!courseId,
    queryKey: courseKey(user?.id, courseId),
    queryFn: () => api.fetchCourse(user!.id, courseId!),
  });
}

function useNextCoursePosition(areaId: string | undefined) {
  const { data: courses } = useCoursesByArea(areaId);
  return useCallback(() => nextActivePosition(courses ?? []), [courses]);
}

function useInvalidateCourseQueries() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useCallback(
    (areaId: string | undefined, courseId?: string) => {
      qc.invalidateQueries({ queryKey: allCoursesKey(user?.id) });
      qc.invalidateQueries({ queryKey: coursesByAreaKey(user?.id, areaId) });
      if (courseId) qc.invalidateQueries({ queryKey: courseKey(user?.id, courseId) });
    },
    [qc, user?.id],
  );
}

export function useCreateCourse(areaId: string) {
  const { user } = useAuth();
  const invalidate = useInvalidateCourseQueries();
  const nextPosition = useNextCoursePosition(areaId);
  return useMutation({
    mutationFn: async (input: CreateCourseInput) => {
      if (!user) throw new Error("Não autenticado");
      return api.createCourse(user.id, input, nextPosition());
    },
    onSuccess: () => invalidate(areaId),
  });
}

export function useUpdateCourse(areaId: string | undefined) {
  const invalidate = useInvalidateCourseQueries();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdateCourseInput }) =>
      api.updateCourse(id, patch),
    onSuccess: (_data, variables) => invalidate(areaId, variables.id),
  });
}

export function useToggleCourseFavorite(areaId: string | undefined) {
  const update = useUpdateCourse(areaId);
  return useCallback(
    (course: Course) =>
      update.mutateAsync({ id: course.id, patch: { is_favorite: !course.is_favorite } }),
    [update],
  );
}

export function useSetCourseStatus(areaId: string | undefined) {
  const update = useUpdateCourse(areaId);
  return useCallback(
    (id: string, status: Course["status"]) => update.mutateAsync({ id, patch: { status } }),
    [update],
  );
}

export function useArchiveCourse(areaId: string | undefined) {
  const update = useUpdateCourse(areaId);
  return useCallback(
    (id: string) => update.mutateAsync({ id, patch: { is_archived: true } }),
    [update],
  );
}

/** Restaurar sempre coloca o curso no final da lista ativa da área — nunca reaproveita a position anterior. */
export function useRestoreCourse(areaId: string | undefined) {
  const { data: courses } = useCoursesByArea(areaId);
  const update = useUpdateCourse(areaId);
  return useCallback(
    (id: string) =>
      update.mutateAsync({
        id,
        patch: { is_archived: false, position: nextActivePosition(courses ?? []) },
      }),
    [update, courses],
  );
}

export function useDeleteCourse(areaId: string | undefined) {
  const invalidate = useInvalidateCourseQueries();
  return useMutation({
    mutationFn: (id: string) => api.deleteCourse(id),
    onSuccess: () => invalidate(areaId),
  });
}

export function useReorderCourses(areaId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = coursesByAreaKey(user?.id, areaId);
  return useMutation({
    mutationFn: (orderedIds: string[]) => {
      const current = qc.getQueryData<Course[]>(key) ?? [];
      const expectedIds = filterByArchiveState(current, "active").map((c) => c.id);
      const validation = validateReorderIds(orderedIds, expectedIds);
      if (!validation.valid) {
        throw new Error(REORDER_REJECTION_MESSAGES[validation.reason]);
      }
      return api.reorderCourses(areaId, orderedIds);
    },
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Course[]>(key);
      if (previous) {
        const byId = new Map(previous.map((c) => [c.id, c]));
        const reordered = orderedIds
          .map((id, index) => {
            const course = byId.get(id);
            return course ? { ...course, position: index } : null;
          })
          .filter((c): c is Course => c !== null);
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
