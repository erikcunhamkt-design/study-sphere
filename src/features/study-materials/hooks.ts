import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import * as api from "./api";
import type { StudyMaterialInsert, StudyMaterialUpdate } from "./types";

export function studyMaterialsKey(userId: string | undefined) {
  return ["study-materials", userId] as const;
}

export function useStudyMaterials() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: studyMaterialsKey(user?.id),
    queryFn: () => api.fetchStudyMaterials(user!.id),
  });
}

export function useCreateStudyMaterial() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<StudyMaterialInsert, "user_id">) => api.createStudyMaterial(user!.id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: studyMaterialsKey(user?.id) });
    },
  });
}

export function useUpdateStudyMaterial() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: StudyMaterialUpdate }) => api.updateStudyMaterial(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: studyMaterialsKey(user?.id) });
    },
  });
}

export function useDeleteStudyMaterial() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteStudyMaterial(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: studyMaterialsKey(user?.id) });
    },
  });
}
