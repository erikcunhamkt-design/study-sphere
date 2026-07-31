import type { FlashcardRating } from "./schema";
import type { FlashcardState } from "./types";

/**
 * Espelho em TS puro do algoritmo implementado em SQL na RPC
 * submit_flashcard_review (migration 20260730150000). Existe SÓ para
 * teste automatizado e para conferência manual no QA da Fase 04
 * (comparar a saída daqui contra a resposta real da RPC) — NUNCA é
 * importado por código de produção. O banco é a única fonte de verdade
 * do agendamento; duplicar a lógica em dois lugares e usar as duas em
 * produção seria exatamente o tipo de deriva que a Fase 03.1 já
 * demonstrou ser perigosa.
 */

const LEARNING_STEPS_DAYS = [1, 3];
const GRADUATING_INTERVAL_DAYS = 4;
const MIN_EASE = 1.3;
const MAX_EASE = 5.0;
const MAX_INTERVAL_DAYS = 36500;

export interface FlashcardScheduleInput {
  state: FlashcardState;
  learningStep: number;
  intervalDays: number;
  ease: number;
}

export interface FlashcardScheduleResult {
  state: FlashcardState;
  learningStep: number;
  intervalDays: number;
  ease: number;
  lapseIncrement: 0 | 1;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeNextSchedule(
  card: FlashcardScheduleInput,
  rating: FlashcardRating,
): FlashcardScheduleResult {
  let state: FlashcardState;
  let learningStep = 0;
  let intervalDays: number;
  let ease = card.ease;
  let lapseIncrement: 0 | 1 = 0;

  if ((card.state === "novo" || card.state === "aprendendo") && rating === "facil") {
    state = "revisao";
    intervalDays = GRADUATING_INTERVAL_DAYS;
  } else if (card.state === "novo") {
    state = "aprendendo";
    intervalDays = LEARNING_STEPS_DAYS[0];
  } else if (card.state === "aprendendo") {
    if (rating === "errei") {
      state = "aprendendo";
      intervalDays = LEARNING_STEPS_DAYS[0];
    } else if (card.learningStep + 1 >= LEARNING_STEPS_DAYS.length) {
      state = "revisao";
      intervalDays = LEARNING_STEPS_DAYS[LEARNING_STEPS_DAYS.length - 1];
    } else {
      state = "aprendendo";
      learningStep = card.learningStep + 1;
      intervalDays = LEARNING_STEPS_DAYS[learningStep];
    }
  } else {
    // revisao
    if (rating === "errei") {
      state = "aprendendo";
      lapseIncrement = 1;
      ease = round2(Math.max(MIN_EASE, card.ease - 0.2));
      intervalDays = LEARNING_STEPS_DAYS[0];
    } else if (rating === "dificil") {
      state = "revisao";
      ease = round2(Math.max(MIN_EASE, card.ease - 0.15));
      intervalDays = Math.ceil(card.intervalDays * 1.2);
    } else if (rating === "bom") {
      state = "revisao";
      intervalDays = Math.ceil(card.intervalDays * card.ease);
    } else {
      // facil
      state = "revisao";
      ease = round2(Math.min(card.ease + 0.15, MAX_EASE));
      intervalDays = Math.ceil(card.intervalDays * card.ease * 1.3);
    }
  }

  intervalDays = Math.min(intervalDays, MAX_INTERVAL_DAYS);

  return { state, learningStep, intervalDays, ease, lapseIncrement };
}
