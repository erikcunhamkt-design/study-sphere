import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applyFsrsReview, rebuildMemoryState } from "@/lib/memory/engine.server";

export function useApplyFsrsReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { conceptId: string; evidenceId: string }) => applyFsrsReview({ data: input }),

    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: ["memory-state", variables.conceptId] });
      void qc.invalidateQueries({ queryKey: ["due-reviews"] });
      void qc.invalidateQueries({ queryKey: ["performance-dashboard"] });
      void qc.invalidateQueries({ queryKey: ["domain-model"] });
    },
  });
}

export function useRebuildMemoryState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conceptId: string) => rebuildMemoryState({ data: { conceptId } }),
    onSuccess: (_, conceptId) => {
      void qc.invalidateQueries({ queryKey: ["memory-state", conceptId] });
      void qc.invalidateQueries({ queryKey: ["due-reviews"] });
      void qc.invalidateQueries({ queryKey: ["performance-dashboard"] });
      void qc.invalidateQueries({ queryKey: ["domain-model"] });
    },
  });
}
