import { useMemo } from "react";

import { useProfile } from "@/hooks/use-preferences";
import { addCivilDays } from "@/lib/timezone";
import { useFlashcardReviews, useFlashcards } from "@/features/flashcards/hooks";
import { useQuestionAttemptsSince, useQuestions } from "@/features/questions/hooks";
import { useStudySessionsSince } from "@/features/study-sessions/hooks";
import { useAllCourses } from "@/features/studies/hooks/use-courses";
import { useAllLessons } from "@/features/studies/hooks/use-lessons";
import { useStudyAreas } from "@/features/studies/hooks/use-study-areas";
import {
  bucketAccuracyEvolution,
  bucketStudyMinutesByDay,
  buildLessonAreaMap,
  computeAccuracyForWindow,
  computeDomainByArea,
  computeTimeByMethod,
} from "./compute";
import type { WindowDays } from "./types";

/** Instante bem no passado — usado para buscar "todo o histórico" reaproveitando os fetches "Since" já existentes. */
const ALL_TIME_ISO = new Date(0).toISOString();

/**
 * Orquestra todas as fontes de dados da Fase 06 e devolve as métricas já
 * computadas (via compute.ts, funções puras) prontas para a UI. Tempo/
 * acertos/evolução são relativos à janela selecionada; domínio por área é
 * sempre histórico completo (decisão do Gate 1 — não depende de `windowDays`).
 */
export function usePerformanceMetrics(windowDays: WindowDays) {
  const { data: profile } = useProfile();
  const timezone = profile?.timezone;

  const windowSinceIso = useMemo(
    () => addCivilDays(timezone, new Date(), -(windowDays - 1)),
    [timezone, windowDays],
  );

  const studySessions = useStudySessionsSince(windowSinceIso);
  const questionAttempts = useQuestionAttemptsSince(windowSinceIso);

  const allQuestionAttempts = useQuestionAttemptsSince(ALL_TIME_ISO);
  const allFlashcardReviews = useFlashcardReviews(ALL_TIME_ISO);
  const questions = useQuestions();
  const flashcards = useFlashcards();
  const areas = useStudyAreas();
  const courses = useAllCourses();
  const lessons = useAllLessons();

  const isLoadingWindowed = studySessions.isLoading || questionAttempts.isLoading;
  const isLoadingDomain =
    allQuestionAttempts.isLoading ||
    allFlashcardReviews.isLoading ||
    questions.isLoading ||
    flashcards.isLoading ||
    areas.isLoading ||
    courses.isLoading ||
    lessons.isLoading;

  const studyMinutesByDay = useMemo(
    () => bucketStudyMinutesByDay(studySessions.data ?? [], windowDays, timezone),
    [studySessions.data, windowDays, timezone],
  );

  const timeByMethod = useMemo(
    () => computeTimeByMethod(studySessions.data ?? []),
    [studySessions.data],
  );

  const accuracy = useMemo(
    () => computeAccuracyForWindow(questionAttempts.data ?? []),
    [questionAttempts.data],
  );

  const accuracyEvolution = useMemo(
    () => bucketAccuracyEvolution(questionAttempts.data ?? [], windowDays, timezone),
    [questionAttempts.data, windowDays, timezone],
  );

  const lessonAreaMap = useMemo(
    () => buildLessonAreaMap(lessons.data ?? [], courses.data ?? []),
    [lessons.data, courses.data],
  );

  const domainByArea = useMemo(
    () =>
      computeDomainByArea({
        questionAttempts: allQuestionAttempts.data ?? [],
        questions: questions.data ?? [],
        flashcardReviews: allFlashcardReviews.data ?? [],
        flashcards: flashcards.data ?? [],
        lessonAreaMap,
      }),
    [
      allQuestionAttempts.data,
      questions.data,
      allFlashcardReviews.data,
      flashcards.data,
      lessonAreaMap,
    ],
  );

  const areaNameById = useMemo(
    () => new Map((areas.data ?? []).map((a) => [a.id, a.name])),
    [areas.data],
  );

  return {
    isLoadingWindowed,
    isLoadingDomain,
    hasAnyStructure: (areas.data?.length ?? 0) > 0,
    studyMinutesByDay,
    timeByMethod,
    accuracy,
    accuracyEvolution,
    domainByArea,
    areaNameById,
  };
}
