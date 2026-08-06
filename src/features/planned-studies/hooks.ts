import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import * as api from "./api";
import type { PlannedStatus } from "./types";

export function plannedStudiesRangeKey(
  userId: string | undefined,
  fromDate: string,
  toDate: string,
) {
  return ["planned-studies-range", userId, fromDate, toDate] as const;
}

export function usePlannedStudiesInRange(fromDate: string, toDate: string) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: plannedStudiesRangeKey(user?.id, fromDate, toDate),
    queryFn: () => api.fetchPlannedStudiesInRange(user!.id, fromDate, toDate),
  });
}

function useInvalidatePlannedStudies() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["planned-studies-range", user?.id] });
  };
}

export function useCreatePlannedStudy() {
  const { user } = useAuth();
  const invalidate = useInvalidatePlannedStudies();
  return useMutation({
    mutationFn: (input: api.CreatePlannedStudyInput) => api.createPlannedStudy(user!.id, input),
    onSuccess: invalidate,
  });
}

export function useUpdatePlannedStudy() {
  const invalidate = useInvalidatePlannedStudies();
  return useMutation({
    mutationFn: (vars: { id: string; input: api.UpdatePlannedStudyInput }) =>
      api.updatePlannedStudy(vars.id, vars.input),
    onSuccess: invalidate,
  });
}

export function useSetPlannedStudyStatus() {
  const invalidate = useInvalidatePlannedStudies();
  return useMutation({
    mutationFn: (vars: { id: string; status: PlannedStatus }) =>
      api.setPlannedStudyStatus(vars.id, vars.status),
    onSuccess: invalidate,
  });
}

export function useDeletePlannedStudy() {
  const invalidate = useInvalidatePlannedStudies();
  return useMutation({
    mutationFn: (id: string) => api.deletePlannedStudy(id),
    onSuccess: invalidate,
  });
}
