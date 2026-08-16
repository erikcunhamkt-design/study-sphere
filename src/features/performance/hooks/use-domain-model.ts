import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { calculateDomainMastery, type DomainMetrics } from "../utils/domain-interpretation";
import { mapToHumanState, checkMetacognitiveMismatch } from "../utils/memory-interpretation";
import { safeArray, logIntegrityIssue } from "@/lib/data-integrity";

export function useDomainModel() {
  const { user } = useAuth();

  return useQuery({
    enabled: !!user,
    queryKey: ["domain-model", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Não autenticado");

      // 1. Fetch Hierarchy: Areas -> Courses -> Lessons -> Concepts
      // PostgREST hierarchy fetch
      const { data: rawAreas, error: areasError } = await supabase
        .from("study_areas")
        .select(`
          id,
          name,
          courses (
            id,
            lessons (
              id,
              concepts (
                id,
                title
              )
            )
          )
        `)
        .eq("user_id", user.id)
        .eq("is_archived", false);

      if (areasError) throw areasError;
      
      const areas = safeArray<any>(rawAreas, "domain.study_areas");

      // 2. Fetch all memory states for the user to join in memory
      const { data: memoryStates, error: msError } = await supabase
        .from("memory_states")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_test_data", false);

      if (msError) throw msError;

      const msMap = new Map(
        safeArray<any>(memoryStates, "domain.memory_states")
          .filter((ms) => {
            if (!ms?.concept_id) {
              logIntegrityIssue("missing_concept", { source: "memory_states", id: ms?.id });
              return false;
            }
            return true;
          })
          .map((ms) => [ms.concept_id, ms]),
      );
      const now = new Date();

      // 3. Process each area
      const domainMap = areas.map(area => {
        const allConcepts: any[] = [];
        
        // Safely traverse the hierarchy (ignora elos inválidos e arquivados)
        safeArray<any>(area?.courses, "domain.courses").forEach((course: any) => {
          if (course?.is_archived) return;
          safeArray<any>(course?.lessons, "domain.lessons").forEach((lesson: any) => {
            if (lesson?.is_archived) return;
            safeArray<any>(lesson?.concepts, "domain.concepts").forEach((concept: any) => {
              if (!concept?.id) {
                logIntegrityIssue("missing_concept", { lessonId: lesson?.id });
                return;
              }
              if (concept.is_archived || concept.is_test_data) return;

              const memory = msMap.get(concept.id);
              const humanState = memory ? mapToHumanState({
                reps: memory.reps || 0,
                stability: memory.stability || 0,
                difficulty: memory.difficulty || 0,
                lastResult: memory.last_result as any,
                lapses: memory.lapses || 0,
                isDue: memory.due ? new Date(memory.due) <= now : false
              }) : mapToHumanState({
                reps: 0,
                stability: 0,
                difficulty: 0,
                lastResult: null,
                lapses: 0,
                isDue: false
              });

              allConcepts.push({
                ...concept,
                memory,
                humanState
              });
            });
          });
        });

        const evaluated = allConcepts.filter(c => c.memory && (c.memory.reps || 0) > 0);
        
        // Regra de Atenção: falhas recentes ou desalinhamento metacognitivo
        // Importante: "due" gera alerta visual, mas não é falha cognitiva por si só
        const attention = allConcepts.filter(c => {
          if (!c.memory) return false;
          const isFailing = c.memory.last_result === 'incorrect' || c.memory.last_result === 'partial';
          const hasMismatch = (c.memory.last_confidence || 0) >= 3 && isFailing;
          return isFailing || hasMismatch;
        });

        const hasMismatch = evaluated.some(c => 
          (c.memory.last_confidence || 0) >= 3 && 
          (c.memory.last_result === 'incorrect' || c.memory.last_result === 'partial')
        );
        
        const totalStability = evaluated.reduce((sum, c) => sum + (c.memory.stability || 0), 0);
        const avgStability = evaluated.length > 0 ? totalStability / evaluated.length : 0;

        const metrics: DomainMetrics = {
          totalConcepts: allConcepts.length,
          evaluatedConcepts: evaluated.length,
          attentionConcepts: attention.length,
          dueConcepts: allConcepts.filter(c => c.memory?.due && new Date(c.memory.due) <= now).length,
          avgStability,
          hasMismatch
        };

        const mastery = calculateDomainMastery(metrics);

        return {
          id: area.id,
          name: area.name,
          mastery,
          metrics,
          concepts: allConcepts
        };
      });

      return domainMap;
    }
  });
}
