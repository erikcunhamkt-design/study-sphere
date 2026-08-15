import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { memoryEngine } from "./engine";
import { State } from "./fsrs/types";
import { RecallResult } from "@/features/study-sessions/types";

/**
 * Server function to rebuild a concept's memory state from history.
 */
export const rebuildMemoryState = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ conceptId: z.string() }).parse(data))
  .handler(async ({ data: { conceptId } }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Fetch history
    const { data: history, error: historyError } = await supabaseAdmin
      .from("cognitive_evidences")
      .select("result, confidence, attempted_at")
      .eq("concept_id", conceptId)
      .eq("user_id", user.id)
      .order("attempted_at", { ascending: true });

    if (historyError) throw historyError;

    // 2. Rebuild via Engine
    const finalCard = memoryEngine.rebuild({
      conceptId,
      userId: user.id,
      history: (history || []).map(h => ({
        result: h.result as RecallResult,
        confidence: h.confidence,
        attemptedAt: h.attempted_at
      }))
    });

    // 3. Persist
    const { error: upsertError } = await supabaseAdmin
      .from("memory_states")
      .upsert({
        user_id: user.id,
        concept_id: conceptId,
        stability: finalCard.stability,
        difficulty: finalCard.difficulty,
        due: finalCard.due.toISOString(),
        last_review: finalCard.last_review?.toISOString(),
        reps: finalCard.reps,
        lapses: finalCard.lapses,
        state: finalCard.state,
        scheduled_days: finalCard.scheduled_days,
        elapsed_days: finalCard.elapsed_days,
        algorithm_version: "fsrs_v4",
        algorithm_name: "fsrs",
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id, concept_id" });

    if (upsertError) throw upsertError;

    return { success: true, card: finalCard };
  });

/**
 * Server function to apply a new review to a concept.
 */
export const applyFsrsReview = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ 
    conceptId: z.string(),
    evidenceId: z.string()
  }).parse(data))
  .handler(async ({ data: { conceptId, evidenceId } }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // 1. Get evidence data
    const { data: evidence, error: evError } = await supabaseAdmin
      .from("cognitive_evidences")
      .select("*")
      .eq("id", evidenceId)
      .single();

    if (evError || !evidence) throw new Error("Evidence not found");

    // 2. Get current state
    const { data: currentState, error: stateError } = await supabaseAdmin
      .from("memory_states")
      .select("*")
      .eq("concept_id", conceptId)
      .eq("user_id", evidence.user_id)
      .maybeSingle();

    const currentCard: any = currentState ? {
      stability: currentState.stability,
      difficulty: currentState.difficulty,
      reps: currentState.reps,
      lapses: currentState.lapses,
      state: currentState.state,
      last_review: currentState.last_review ? new Date(currentState.last_review) : undefined,
      due: new Date(currentState.due),
    } : {
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      state: State.New,
      due: new Date(),
    };

    // 3. Calculate next state
    const result = memoryEngine.applyReview(
      currentCard,
      evidence.result as RecallResult,
      evidence.confidence,
      new Date(evidence.attempted_at)
    );

    // 4. Update memory state
    const { error: upsertError } = await supabaseAdmin
      .from("memory_states")
      .upsert({
        user_id: evidence.user_id,
        concept_id: conceptId,
        stability: result.card.stability,
        difficulty: result.card.difficulty,
        due: result.card.due.toISOString(),
        last_review: result.card.last_review?.toISOString(),
        reps: result.card.reps,
        lapses: result.card.lapses,
        state: result.card.state,
        scheduled_days: result.card.scheduled_days,
        elapsed_days: result.card.elapsed_days,
        algorithm_version: result.version,
        algorithm_name: result.algorithm,
        updated_at: new Date().toISOString(),
        last_result: evidence.result,
        last_confidence: evidence.confidence
      }, { onConflict: "user_id, concept_id" });

    if (upsertError) throw upsertError;

    // 5. Update evidence metadata (mismatch)
    if (result.mismatch) {
      await supabaseAdmin
        .from("cognitive_evidences")
        .update({ confidence_mismatch: true })
        .eq("id", evidenceId as string);
    }


    return { success: true, card: result.card };
  });
