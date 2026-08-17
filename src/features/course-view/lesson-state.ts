import type { LessonViewState } from "./use-course-overview";

/** Estados já existentes no produto — nenhum estado cognitivo novo. */
export const LESSON_STATE_LABELS: Record<LessonViewState, string> = {
  in_progress: "Em andamento",
  review_due: "Revisar",
  first_contact_done: "Primeiro contato",
  no_material: "Sem material",
  not_started: "Não iniciado",
};

export const LESSON_STATE_CLASSES: Record<LessonViewState, string> = {
  in_progress: "bg-primary/10 text-primary border-primary/20",
  review_due: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  first_contact_done: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  no_material: "bg-muted text-muted-foreground border-border/40",
  not_started: "bg-muted/50 text-muted-foreground border-border/40",
};

export const LESSON_STATE_CTA: Record<LessonViewState, string> = {
  in_progress: "Continuar",
  review_due: "Revisar",
  first_contact_done: "Estudar de novo",
  no_material: "Adicionar material",
  not_started: "Começar",
};
