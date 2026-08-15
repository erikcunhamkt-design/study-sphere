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

export type RecallResult = 
  | 'correct' 
  | 'partial' 
  | 'incorrect' 
  | 'no_answer' 
  | 'abandoned'
  | 'self_reported_correct'
  | 'self_reported_partial'
  | 'self_reported_incorrect';

export type ResultSource = 'self_assessment' | 'objective' | 'manual' | 'ai';

export interface ConceptRow {
  id: string;
  user_id: string;
  lesson_id: string | null;
  title: string;
  description: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemoryStateRow {
  id: string;
  user_id: string;
  concept_id: string;
  strength: number;
  stability: number;
  difficulty: number;
  last_recalled_at: string | null;
  last_result: RecallResult | null;
  last_confidence: number | null;
  attempt_count: number;
  successful_recalls: number;
  failed_recalls: number;
  updated_at: string;
}

export interface RecuperacaoDetails {
  questionAttempts: {
    questionId: string;
    evidenceId?: string;
    response: string;
    result: RecallResult;
    confidence: number; // 1-4
    responseTimeMs: number;
    attemptedAt: string;
  }[];
  lessonId: string;
  courseId?: string;
  publishedVersion?: number | null;
  completedAt?: string;
}

export interface CognitiveEvidenceRow {
  id: string;
  user_id: string;
  lesson_id: string | null;
  question_id: string | null;
  session_id: string | null;
  published_version: number | null;
  result: RecallResult;
  result_source: ResultSource;
  confidence: number;
  confidence_source: string;
  response_time_ms: number;
  concept_id: string | null;
  attempted_at: string;
  created_at: string;
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
