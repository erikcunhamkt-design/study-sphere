export type QuestionType = "multipla_escolha" | "discursiva";

export interface QuestionRow {
  id: string;
  user_id: string;
  lesson_id: string | null;
  type: QuestionType;
  statement: string;
  options: string[];
  correct_option_index: number | null;
  expected_answer: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExamRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExamQuestionRow {
  exam_id: string;
  question_id: string;
  user_id: string;
  position: number;
  created_at: string;
}

/** Questão de um simulado já unida com o conteúdo da questão (join client-side). */
export interface ExamQuestionWithQuestion extends ExamQuestionRow {
  question: QuestionRow;
}

export interface ExamAttemptRow {
  id: string;
  user_id: string;
  exam_id: string | null;
  started_at: string;
  ended_at: string | null;
  score_correct: number | null;
  score_total: number | null;
  duration_seconds: number | null;
}

export interface QuestionAttemptRow {
  id: string;
  user_id: string;
  question_id: string;
  exam_attempt_id: string | null;
  attempted_at: string;
  selected_option_index: number | null;
  self_assessed_correct: boolean | null;
  is_correct: boolean;
}

/** Forma mínima para métricas (Fase 06) — sem os campos de forma da resposta. */
export interface QuestionAttemptForMetrics {
  question_id: string;
  attempted_at: string;
  is_correct: boolean;
  exam_attempt_id: string | null;
}

/** Devolvido por submit_question_attempt — o cliente nunca calcula is_correct sozinho. */
export interface SubmitQuestionAttemptResult {
  attempt_id: string;
  is_correct: boolean;
}

/** Devolvido por finish_exam_attempt — placar congelado, o cliente só exibe. */
export interface FinishExamAttemptResult {
  exam_attempt_id: string;
  score_correct: number;
  score_total: number;
  duration_seconds: number;
}
