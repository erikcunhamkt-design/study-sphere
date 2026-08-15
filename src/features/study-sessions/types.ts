export const STUDY_METHOD_VALUES = [
  "pomodoro",
  "feynman",
  "blurting",
  "cornell",
  "livre",
  "aprender",
  "recuperacao",
  "flashcards",
  "exame",
  "recordacao_ativa",
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
  anotacoes?: string;
  courseId?: string;
  lessonId?: string;
  publishedVersion?: number | null;
  blocksCount?: number;
  blocksViewed?: number;
  progressPercent?: number;
  completedAt?: string;
}

export interface RecuperacaoDetails {
  questionAttempts: {
    questionId: string;
    response: string;
    confidence: "nenhum" | "dificil" | "lembrei" | "facil";
    responseTimeSeconds: number;
    isCorrect?: boolean;
    attemptedAt: string;
  }[];
  lessonId: string;
  courseId?: string;
  publishedVersion?: number | null;
  completedAt?: string;
}


export type StudySessionDetails =
  | PomodoroDetails
  | FeynmanDetails
  | BlurtingDetails
  | CornellDetails
  | LivreDetails
  | RecuperacaoDetails
  | Record<string, never>;

export interface StudySessionRow {
  id: string;
  user_id: string;
  lesson_id: string | null;
  method: StudyMethod;
  is_free_session: boolean;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  details: StudySessionDetails;
  published_version: number | null;
  created_at: string;
  updated_at: string;
}
