import type { StudyMethod } from "./types";

export const STUDY_METHOD_LABELS: Record<StudyMethod, string> = {
  pomodoro: "Pomodoro",
  feynman: "Explicar conceito (Feynman)",
  recordacao_ativa: "Testar memória (Flashcards)",
  blurting: "Recuperar o que lembra (Blurting)",
  cornell: "Anotar e organizar (Cornell)",
  livre: "Sessão Livre",
  aprender: "Aprender primeiro",
};
