import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applyFsrsReview, rebuildMemoryState } from "./engine.server";

export function useApplyFsrsReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { conceptId: string; evidenceId: string }) => applyFsrsReview(input),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: ["memory-state", variables.conceptId] });
      void qc.invalidateQueries({ queryKey: ["due-reviews"] });
    },
  });
}

export function useRebuildMemoryState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conceptId: string) => rebuildMemoryState({ conceptId }),
    onSuccess: (_, conceptId) => {
      void qc.invalidateQueries({ queryKey: ["memory-state", conceptId] });
      void qc.invalidateQueries({ queryKey: ["due-reviews"] });
    },
  });
}
