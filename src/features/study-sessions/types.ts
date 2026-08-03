export const STUDY_METHOD_VALUES = [
  "pomodoro",
  "feynman",
  "recordacao_ativa",
  "blurting",
  "cornell",
  "livre",
] as const;

export type StudyMethod = (typeof STUDY_METHOD_VALUES)[number];

export interface PomodoroDetails {
  cycles_completed: number;
}

export interface FeynmanDetails {
  explicacao: string;
}

export interface BlurtingDetails {
  texto: string;
}

export interface CornellDetails {
  notas: string;
  pistas: string;
  resumo: string;
}

export interface LivreDetails {
  nota?: string;
}

export type StudySessionDetails =
  | PomodoroDetails
  | FeynmanDetails
  | BlurtingDetails
  | CornellDetails
  | LivreDetails
  | Record<string, never>;

export interface StudySessionRow {
  id: string;
  user_id: string;
  lesson_id: string | null;
  method: StudyMethod;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  details: StudySessionDetails;
  created_at: string;
  updated_at: string;
}

/** Forma mínima para métricas (Fase 06) — sem `details`, que as métricas não usam. */
export interface StudySessionForMetrics {
  id: string;
  method: StudyMethod;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  lesson_id: string | null;
}
