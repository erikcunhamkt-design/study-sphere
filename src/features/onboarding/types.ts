/**
 * ONBOARDING + FIRST CYCLE — estados da primeira experiência.
 *
 * O onboarding do Dominus não é um tutorial: é o próprio produto guiando
 * o usuário pelo primeiro ciclo cognitivo completo
 * (conteúdo → primeiro contato → recuperação → evidência → revisão).
 */
export type OnboardingState =
  | "new_user"
  | "onboarding_started"
  | "has_content"
  | "first_study_started"
  | "first_contact_completed"
  | "first_recall_completed"
  | "first_cycle_completed"
  | "skipped";

export const ONBOARDING_ORDER: OnboardingState[] = [
  "new_user",
  "onboarding_started",
  "has_content",
  "first_study_started",
  "first_contact_completed",
  "first_recall_completed",
  "first_cycle_completed",
];

/** Estados terminais: a primeira experiência não deve mais interferir na UI. */
export function isOnboardingDone(state: OnboardingState): boolean {
  return state === "first_cycle_completed" || state === "skipped";
}

/** Nunca retroceder o estado (retomada após abandono não pode resetar progresso). */
export function maxState(a: OnboardingState, b: OnboardingState): OnboardingState {
  if (a === "skipped" || b === "skipped") return "skipped";
  const ia = ONBOARDING_ORDER.indexOf(a);
  const ib = ONBOARDING_ORDER.indexOf(b);
  return ib > ia ? b : a;
}

/** Eventos internos (sem dashboard): medem onde o usuário abandona. */
export type OnboardingEvent =
  | "onboarding_started"
  | "onboarding_skipped"
  | "onboarding_completed"
  | "first_study_started"
  | "first_contact_completed"
  | "first_recall_completed"
  | "first_cycle_completed";
