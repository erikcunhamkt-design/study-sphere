import { addCivilDays, resolveTimezone, startOfDayIso, startOfWeekIso } from "@/lib/timezone";
import type { StudyMethod, StudySessionForMetrics } from "@/features/study-sessions/types";
import type { QuestionAttemptForMetrics } from "@/features/questions/types";
import type {
  AccuracyBucket,
  AreaDomainResult,
  DayMinutes,
  DomainByAreaResult,
  MethodMinutes,
  WindowDays,
} from "./types";

export const MIN_SAMPLE_SIZE = 5;

function formatDayLabel(bucketStartIso: string, timezone: string | null | undefined): string {
  return new Date(bucketStartIso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: resolveTimezone(timezone),
  });
}

/** Minutos estudados por dia (sessões finalizadas), sempre no dia civil de `timezone`. */
export function bucketStudyMinutesByDay(
  sessions: StudySessionForMetrics[],
  windowDays: WindowDays,
  timezone: string | null | undefined,
  now = new Date(),
): DayMinutes[] {
  const secondsByBucket = new Map<string, number>();
  for (const session of sessions) {
    if (session.ended_at === null || session.duration_seconds === null) continue;
    const key = startOfDayIso(timezone, new Date(session.started_at));
    secondsByBucket.set(key, (secondsByBucket.get(key) ?? 0) + session.duration_seconds);
  }

  const buckets: DayMinutes[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const bucketStartIso = addCivilDays(timezone, now, -i);
    buckets.push({
      bucketStartIso,
      label: formatDayLabel(bucketStartIso, timezone),
      minutes: Math.round((secondsByBucket.get(bucketStartIso) ?? 0) / 60),
    });
  }
  return buckets;
}

/**
 * Acerto agregado numa janela. Deliberadamente NÃO filtra por estado do
 * exame (`exam_attempt_id` presente/ausente, tentativa finalizada ou não)
 * — uma resposta dada dentro de um simulado abandonado ainda é uma
 * resposta real do usuário e conta no acerto (ajuste #4 do Gate 1 da Fase
 * 06). Não "corrija" isso achando que é bug.
 */
export function computeAccuracyForWindow(attempts: QuestionAttemptForMetrics[]): {
  accuracyPct: number | null;
  total: number;
  correct: number;
} {
  const total = attempts.length;
  const correct = attempts.filter((a) => a.is_correct).length;
  return { total, correct, accuracyPct: total > 0 ? Math.round((100 * correct) / total) : null };
}

/**
 * Evolução do acerto por bucket temporal — diário para janelas de 7/30
 * dias, semanal (13 buckets) para 90 dias, pra não poluir o gráfico.
 * Buckets sem resposta ficam com accuracyPct = null (gap real na linha do
 * gráfico via connectNulls={false}), nunca 0%.
 */
export function bucketAccuracyEvolution(
  attempts: QuestionAttemptForMetrics[],
  windowDays: WindowDays,
  timezone: string | null | undefined,
  now = new Date(),
): AccuracyBucket[] {
  const useWeekly = windowDays === 90;
  const bucketCount = useWeekly ? 13 : windowDays;
  const stepDays = useWeekly ? 7 : 1;
  const bucketKeyFor = (d: Date) =>
    useWeekly ? startOfWeekIso(timezone, d) : startOfDayIso(timezone, d);

  const tallyByBucket = new Map<string, { correct: number; total: number }>();
  for (const attempt of attempts) {
    const key = bucketKeyFor(new Date(attempt.attempted_at));
    const t = tallyByBucket.get(key) ?? { correct: 0, total: 0 };
    t.total += 1;
    if (attempt.is_correct) t.correct += 1;
    tallyByBucket.set(key, t);
  }

  const buckets: AccuracyBucket[] = [];
  for (let i = bucketCount - 1; i >= 0; i--) {
    const anchorIso = addCivilDays(timezone, now, -i * stepDays);
    const bucketStartIso = useWeekly ? startOfWeekIso(timezone, new Date(anchorIso)) : anchorIso;
    const t = tallyByBucket.get(bucketStartIso);
    buckets.push({
      bucketStartIso,
      label: formatDayLabel(bucketStartIso, timezone),
      total: t?.total ?? 0,
      accuracyPct: t && t.total > 0 ? Math.round((100 * t.correct) / t.total) : null,
    });
  }
  return buckets;
}

/** Minutos estudados por método (sessões finalizadas), maior primeiro. */
export function computeTimeByMethod(sessions: StudySessionForMetrics[]): MethodMinutes[] {
  const secondsByMethod = new Map<StudyMethod, number>();
  for (const session of sessions) {
    if (session.ended_at === null || session.duration_seconds === null) continue;
    secondsByMethod.set(
      session.method,
      (secondsByMethod.get(session.method) ?? 0) + session.duration_seconds,
    );
  }
  return [...secondsByMethod.entries()]
    .map(([method, seconds]) => ({ method, minutes: Math.round(seconds / 60) }))
    .sort((a, b) => b.minutes - a.minutes);
}

/** lessonId -> areaId, via lesson.course_id -> course.study_area_id (lessons já carregam course_id direto, sem precisar do módulo). */
export function buildLessonAreaMap(
  lessons: { id: string; course_id: string }[],
  courses: { id: string; study_area_id: string }[],
): Map<string, string> {
  const areaByCourse = new Map(courses.map((c) => [c.id, c.study_area_id]));
  const map = new Map<string, string>();
  for (const lesson of lessons) {
    const areaId = areaByCourse.get(lesson.course_id);
    if (areaId) map.set(lesson.id, areaId);
  }
  return map;
}

/**
 * Domínio estimado por área — sinal preferencial é o acerto em questões da
 * área; se a área não tiver questões suficientes (< minSample) mas tiver
 * revisões de flashcard suficientes, mostra a retenção de flashcards como
 * sinal alternativo (nunca misturados num score único — pesos combinados
 * seriam um número inventado, não um dado).
 *
 * Questão avulsa (questions.lesson_id NULL) nunca entra aqui, nem na
 * contagem do minSample de nenhuma área — ela já foi contada no acerto
 * geral (computeAccuracyForWindow), que não depende de área. Deliberado
 * (ajuste #1 do Gate 1 da Fase 06): sem isso, uma questão avulsa "vazaria"
 * pra dentro de uma área qualquer ou inflaria o denominador sem pertencer
 * a nenhuma.
 */
export function computeDomainByArea(params: {
  questionAttempts: { question_id: string; is_correct: boolean }[];
  questions: { id: string; lesson_id: string | null }[];
  flashcardReviews: { flashcard_id: string; rating: string }[];
  flashcards: { id: string; lesson_id: string | null }[];
  lessonAreaMap: Map<string, string>;
  minSample?: number;
}): DomainByAreaResult {
  const minSample = params.minSample ?? MIN_SAMPLE_SIZE;

  const areaByQuestionId = new Map<string, string>();
  for (const q of params.questions) {
    if (!q.lesson_id) continue;
    const areaId = params.lessonAreaMap.get(q.lesson_id);
    if (areaId) areaByQuestionId.set(q.id, areaId);
  }

  const questionTallyByArea = new Map<string, { correct: number; total: number }>();
  for (const attempt of params.questionAttempts) {
    const areaId = areaByQuestionId.get(attempt.question_id);
    if (!areaId) continue;
    const t = questionTallyByArea.get(areaId) ?? { correct: 0, total: 0 };
    t.total += 1;
    if (attempt.is_correct) t.correct += 1;
    questionTallyByArea.set(areaId, t);
  }

  const areaByFlashcardId = new Map<string, string>();
  for (const f of params.flashcards) {
    if (!f.lesson_id) continue;
    const areaId = params.lessonAreaMap.get(f.lesson_id);
    if (areaId) areaByFlashcardId.set(f.id, areaId);
  }

  const flashcardTallyByArea = new Map<string, { success: number; total: number }>();
  for (const review of params.flashcardReviews) {
    const areaId = areaByFlashcardId.get(review.flashcard_id);
    if (!areaId) continue;
    const t = flashcardTallyByArea.get(areaId) ?? { success: 0, total: 0 };
    t.total += 1;
    if (review.rating !== "errei") t.success += 1;
    flashcardTallyByArea.set(areaId, t);
  }

  const allAreaIds = new Set([...questionTallyByArea.keys(), ...flashcardTallyByArea.keys()]);
  const byArea: AreaDomainResult[] = [];
  const insufficientAreaIds: string[] = [];

  for (const areaId of allAreaIds) {
    const q = questionTallyByArea.get(areaId);
    const f = flashcardTallyByArea.get(areaId);
    const questionAccuracy =
      q && q.total >= minSample
        ? { pct: Math.round((100 * q.correct) / q.total), total: q.total }
        : null;
    const flashcardRetention =
      !questionAccuracy && f && f.total >= minSample
        ? { pct: Math.round((100 * f.success) / f.total), total: f.total }
        : null;

    if (questionAccuracy || flashcardRetention) {
      byArea.push({ areaId, questionAccuracy, flashcardRetention });
    } else {
      insufficientAreaIds.push(areaId);
    }
  }

  return { byArea, insufficientAreaIds };
}
