import { describe, expect, it } from "vitest";

import {
  MIN_SAMPLE_SIZE,
  bucketAccuracyEvolution,
  bucketStudyMinutesByDay,
  buildLessonAreaMap,
  computeAccuracyForWindow,
  computeDomainByArea,
  computeTimeByMethod,
} from "./compute";
import type { StudySessionForMetrics } from "@/features/study-sessions/types";
import type { QuestionAttemptForMetrics } from "@/features/questions/types";

const NOW = new Date("2026-08-02T12:00:00.000Z"); // domingo, UTC

function session(overrides: Partial<StudySessionForMetrics>): StudySessionForMetrics {
  return {
    id: "s1",
    method: "pomodoro",
    started_at: "2026-08-02T10:00:00.000Z",
    ended_at: "2026-08-02T11:00:00.000Z",
    duration_seconds: 3600,
    lesson_id: null,
    ...overrides,
  };
}

function attempt(overrides: Partial<QuestionAttemptForMetrics>): QuestionAttemptForMetrics {
  return {
    question_id: "q1",
    attempted_at: "2026-08-02T10:00:00.000Z",
    is_correct: true,
    exam_attempt_id: null,
    ...overrides,
  };
}

describe("bucketStudyMinutesByDay", () => {
  it("soma minutos no bucket do dia certo (UTC)", () => {
    const buckets = bucketStudyMinutesByDay([session({})], 7, "UTC", NOW);
    expect(buckets).toHaveLength(7);
    expect(buckets[6]!.minutes).toBe(60); // hoje, 3600s = 60min
    expect(buckets.slice(0, 6).every((b) => b.minutes === 0)).toBe(true);
  });

  it("ignora sessão sem ended_at ou sem duration_seconds", () => {
    const buckets = bucketStudyMinutesByDay(
      [session({ ended_at: null, duration_seconds: null })],
      7,
      "UTC",
      NOW,
    );
    expect(buckets.every((b) => b.minutes === 0)).toBe(true);
  });

  it("soma múltiplas sessões no mesmo dia", () => {
    const buckets = bucketStudyMinutesByDay(
      [session({ duration_seconds: 1800 }), session({ duration_seconds: 900 })],
      7,
      "UTC",
      NOW,
    );
    expect(buckets[6]!.minutes).toBe(Math.round((1800 + 900) / 60));
  });

  it("regressão do achado do Gate 3: janela de 30 dias atravessando a virada de horário de verão (America/New_York) não duplica nem pula bucket", () => {
    const buckets = bucketStudyMinutesByDay(
      [],
      30,
      "America/New_York",
      new Date("2026-03-11T15:00:00.000Z"),
    );
    expect(buckets).toHaveLength(30);
    const uniqueDays = new Set(buckets.map((b) => b.bucketStartIso));
    expect(uniqueDays.size).toBe(30);
  });
});

describe("computeAccuracyForWindow", () => {
  it("retorna null quando não há respostas", () => {
    expect(computeAccuracyForWindow([])).toEqual({ accuracyPct: null, total: 0, correct: 0 });
  });

  it("calcula a porcentagem corretamente", () => {
    const result = computeAccuracyForWindow([
      attempt({ is_correct: true }),
      attempt({ is_correct: true }),
      attempt({ is_correct: false }),
      attempt({ is_correct: false }),
    ]);
    expect(result).toEqual({ accuracyPct: 50, total: 4, correct: 2 });
  });

  it("ajuste #4: conta respostas de simulado abandonado/em andamento (exam_attempt_id presente, sem filtro de estado)", () => {
    const result = computeAccuracyForWindow([
      attempt({ is_correct: true, exam_attempt_id: null }), // avulsa
      attempt({ is_correct: true, exam_attempt_id: "exam-em-andamento" }), // dentro de simulado
      attempt({ is_correct: false, exam_attempt_id: "exam-em-andamento" }),
    ]);
    expect(result.total).toBe(3);
    expect(result.correct).toBe(2);
  });
});

describe("computeTimeByMethod", () => {
  it("soma por método e ordena do maior pro menor", () => {
    const result = computeTimeByMethod([
      session({ method: "pomodoro", duration_seconds: 1200 }),
      session({ method: "feynman", duration_seconds: 3000 }),
      session({ method: "pomodoro", duration_seconds: 600 }),
    ]);
    expect(result).toEqual([
      { method: "feynman", minutes: 50 },
      { method: "pomodoro", minutes: 30 },
    ]);
  });

  it("ignora sessão não finalizada", () => {
    const result = computeTimeByMethod([session({ ended_at: null, duration_seconds: null })]);
    expect(result).toEqual([]);
  });
});

describe("bucketAccuracyEvolution", () => {
  it("janela de 7 dias: bucketiza por dia, gap vira null (não 0)", () => {
    const buckets = bucketAccuracyEvolution(
      [attempt({ attempted_at: "2026-08-02T10:00:00.000Z", is_correct: true })],
      7,
      "UTC",
      NOW,
    );
    expect(buckets).toHaveLength(7);
    expect(buckets[6]!.accuracyPct).toBe(100);
    expect(buckets[6]!.total).toBe(1);
    expect(buckets.slice(0, 6).every((b) => b.accuracyPct === null && b.total === 0)).toBe(true);
  });

  it("janela de 90 dias: bucketiza por semana (13 buckets)", () => {
    const buckets = bucketAccuracyEvolution([], 90, "UTC", NOW);
    expect(buckets).toHaveLength(13);
  });

  it("regressão do achado do Gate 3: 13 buckets semanais atravessando a virada de horário de verão (America/New_York) sem duplicar nem pular semana", () => {
    const buckets = bucketAccuracyEvolution(
      [],
      90,
      "America/New_York",
      new Date("2026-03-11T15:00:00.000Z"),
    );
    expect(buckets).toHaveLength(13);
    const uniqueWeeks = new Set(buckets.map((b) => b.bucketStartIso));
    expect(uniqueWeeks.size).toBe(13);
  });

  it("virada de semana: respostas em domingo e na segunda seguinte caem em buckets diferentes (90 dias)", () => {
    const buckets = bucketAccuracyEvolution(
      [
        attempt({ attempted_at: "2026-08-02T10:00:00.000Z", is_correct: true }), // domingo
        attempt({ attempted_at: "2026-08-03T10:00:00.000Z", is_correct: false }), // segunda seguinte
      ],
      90,
      "UTC",
      new Date("2026-08-03T12:00:00.000Z"),
    );
    const withData = buckets.filter((b) => b.total > 0);
    expect(withData).toHaveLength(2);
    expect(withData[0]!.bucketStartIso).not.toBe(withData[1]!.bucketStartIso);
  });

  it("virada de mês: respostas de sexta 30/jan e domingo 01/fev (mesma semana Mon-Sun) caem no mesmo bucket", () => {
    const buckets = bucketAccuracyEvolution(
      [
        attempt({ attempted_at: "2026-01-30T10:00:00.000Z", is_correct: true }),
        attempt({ attempted_at: "2026-02-01T10:00:00.000Z", is_correct: true }),
      ],
      90,
      "UTC",
      new Date("2026-02-01T12:00:00.000Z"),
    );
    const withData = buckets.filter((b) => b.total > 0);
    expect(withData).toHaveLength(1);
    expect(withData[0]!.total).toBe(2);
  });
});

describe("buildLessonAreaMap", () => {
  it("mapeia lessonId -> areaId via course_id -> study_area_id", () => {
    const map = buildLessonAreaMap(
      [
        { id: "lesson-1", course_id: "course-1" },
        { id: "lesson-2", course_id: "course-2" },
      ],
      [
        { id: "course-1", study_area_id: "area-1" },
        { id: "course-2", study_area_id: "area-2" },
      ],
    );
    expect(map.get("lesson-1")).toBe("area-1");
    expect(map.get("lesson-2")).toBe("area-2");
  });

  it("aula sem curso correspondente não entra no mapa", () => {
    const map = buildLessonAreaMap([{ id: "lesson-1", course_id: "curso-orfao" }], []);
    expect(map.has("lesson-1")).toBe(false);
  });
});

describe("computeDomainByArea", () => {
  const lessonAreaMap = new Map([["lesson-area-1", "area-1"]]);

  function makeAttempts(count: number, correctCount: number, questionId = "q-area-1") {
    return Array.from({ length: count }, (_, i) => ({
      question_id: questionId,
      is_correct: i < correctCount,
    }));
  }

  it("ajuste #1: questão avulsa (lesson_id null) nunca entra no domínio nem no MIN_SAMPLE, mesmo com respostas suficientes", () => {
    const result = computeDomainByArea({
      questionAttempts: makeAttempts(MIN_SAMPLE_SIZE + 5, MIN_SAMPLE_SIZE + 5, "q-avulsa"),
      questions: [{ id: "q-avulsa", lesson_id: null }],
      flashcardReviews: [],
      flashcards: [],
      lessonAreaMap,
    });
    expect(result.byArea).toEqual([]);
    expect(result.insufficientAreaIds).toEqual([]); // nem aparece como "insuficiente": não pertence a nenhuma área
  });

  it("área com respostas suficientes mostra acerto em questões", () => {
    const result = computeDomainByArea({
      questionAttempts: makeAttempts(MIN_SAMPLE_SIZE, MIN_SAMPLE_SIZE - 1),
      questions: [{ id: "q-area-1", lesson_id: "lesson-area-1" }],
      flashcardReviews: [],
      flashcards: [],
      lessonAreaMap,
    });
    expect(result.byArea).toHaveLength(1);
    expect(result.byArea[0]).toEqual({
      areaId: "area-1",
      questionAccuracy: {
        pct: Math.round((100 * (MIN_SAMPLE_SIZE - 1)) / MIN_SAMPLE_SIZE),
        total: MIN_SAMPLE_SIZE,
      },
      flashcardRetention: null,
    });
  });

  it("área abaixo do MIN_SAMPLE em questões, mas com flashcards suficientes, cai pro sinal de retenção", () => {
    const result = computeDomainByArea({
      questionAttempts: makeAttempts(MIN_SAMPLE_SIZE - 1, MIN_SAMPLE_SIZE - 1),
      questions: [{ id: "q-area-1", lesson_id: "lesson-area-1" }],
      flashcardReviews: Array.from({ length: MIN_SAMPLE_SIZE }, (_, i) => ({
        flashcard_id: "f-area-1",
        rating: i === 0 ? "errei" : "bom",
      })),
      flashcards: [{ id: "f-area-1", lesson_id: "lesson-area-1" }],
      lessonAreaMap,
    });
    expect(result.byArea).toHaveLength(1);
    expect(result.byArea[0]!.questionAccuracy).toBeNull();
    expect(result.byArea[0]!.flashcardRetention).toEqual({
      pct: Math.round((100 * (MIN_SAMPLE_SIZE - 1)) / MIN_SAMPLE_SIZE),
      total: MIN_SAMPLE_SIZE,
    });
  });

  it("acerto em questões tem prioridade sobre retenção de flashcards quando ambos passam o MIN_SAMPLE", () => {
    const result = computeDomainByArea({
      questionAttempts: makeAttempts(MIN_SAMPLE_SIZE, MIN_SAMPLE_SIZE),
      questions: [{ id: "q-area-1", lesson_id: "lesson-area-1" }],
      flashcardReviews: Array.from({ length: MIN_SAMPLE_SIZE }, () => ({
        flashcard_id: "f-area-1",
        rating: "errei",
      })),
      flashcards: [{ id: "f-area-1", lesson_id: "lesson-area-1" }],
      lessonAreaMap,
    });
    expect(result.byArea[0]!.questionAccuracy).not.toBeNull();
    expect(result.byArea[0]!.flashcardRetention).toBeNull();
  });

  it("área com atividade mas abaixo do MIN_SAMPLE nos dois sinais entra em insufficientAreaIds", () => {
    const result = computeDomainByArea({
      questionAttempts: makeAttempts(1, 1),
      questions: [{ id: "q-area-1", lesson_id: "lesson-area-1" }],
      flashcardReviews: [],
      flashcards: [],
      lessonAreaMap,
    });
    expect(result.byArea).toEqual([]);
    expect(result.insufficientAreaIds).toEqual(["area-1"]);
  });

  it("respeita minSample customizado", () => {
    const result = computeDomainByArea({
      questionAttempts: makeAttempts(2, 2),
      questions: [{ id: "q-area-1", lesson_id: "lesson-area-1" }],
      flashcardReviews: [],
      flashcards: [],
      lessonAreaMap,
      minSample: 2,
    });
    expect(result.byArea).toHaveLength(1);
  });
});
