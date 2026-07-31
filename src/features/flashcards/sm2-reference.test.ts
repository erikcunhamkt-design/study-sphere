import { describe, expect, it } from "vitest";

import { computeNextSchedule, type FlashcardScheduleInput } from "./sm2-reference";

const DEFAULT_EASE = 2.5;

function card(overrides: Partial<FlashcardScheduleInput> = {}): FlashcardScheduleInput {
  return { state: "novo", learningStep: 0, intervalDays: 0, ease: DEFAULT_EASE, ...overrides };
}

describe("computeNextSchedule — matriz de transições do Gate 1", () => {
  it("novo + facil -> revisao (graduação imediata), interval=4d, ease inalterado", () => {
    const result = computeNextSchedule(card({ state: "novo" }), "facil");
    expect(result).toMatchObject({ state: "revisao", intervalDays: 4, ease: DEFAULT_EASE });
  });

  it.each(["errei", "dificil", "bom"] as const)(
    "novo + %s -> aprendendo, step=0, interval=1d",
    (rating) => {
      const result = computeNextSchedule(card({ state: "novo" }), rating);
      expect(result).toMatchObject({
        state: "aprendendo",
        learningStep: 0,
        intervalDays: 1,
        ease: DEFAULT_EASE,
      });
    },
  );

  it("aprendendo + facil -> revisao (graduação imediata), interval=4d, ease inalterado", () => {
    const result = computeNextSchedule(
      card({ state: "aprendendo", learningStep: 0, intervalDays: 1 }),
      "facil",
    );
    expect(result).toMatchObject({ state: "revisao", intervalDays: 4, ease: DEFAULT_EASE });
  });

  it("aprendendo + errei -> aprendendo, step=0, interval=1d (não é lapso)", () => {
    const result = computeNextSchedule(
      card({ state: "aprendendo", learningStep: 1, intervalDays: 3 }),
      "errei",
    );
    expect(result).toMatchObject({ state: "aprendendo", learningStep: 0, intervalDays: 1 });
    expect(result.lapseIncrement).toBe(0);
  });

  it("aprendendo + bom no primeiro passo -> avança para o próximo passo (3d)", () => {
    const result = computeNextSchedule(
      card({ state: "aprendendo", learningStep: 0, intervalDays: 1 }),
      "bom",
    );
    expect(result).toMatchObject({ state: "aprendendo", learningStep: 1, intervalDays: 3 });
  });

  it("aprendendo + bom no último passo -> graduação, interval = passo atual (3d)", () => {
    const result = computeNextSchedule(
      card({ state: "aprendendo", learningStep: 1, intervalDays: 3 }),
      "bom",
    );
    expect(result).toMatchObject({ state: "revisao", learningStep: 0, intervalDays: 3 });
  });

  it("revisao + errei -> LAPSO: lapses+=1, ease-=0.20 (piso 1.30), volta para aprendendo", () => {
    const result = computeNextSchedule(
      card({ state: "revisao", intervalDays: 10, ease: 2.5 }),
      "errei",
    );
    expect(result).toMatchObject({
      state: "aprendendo",
      learningStep: 0,
      intervalDays: 1,
      ease: 2.3,
      lapseIncrement: 1,
    });
  });

  it("revisao + errei respeita o piso de ease 1.30", () => {
    const result = computeNextSchedule(
      card({ state: "revisao", intervalDays: 10, ease: 1.35 }),
      "errei",
    );
    expect(result.ease).toBe(1.3);
  });

  it("revisao + dificil -> ease-=0.15, interval=ceil(interval*1.2)", () => {
    const result = computeNextSchedule(
      card({ state: "revisao", intervalDays: 10, ease: 2.5 }),
      "dificil",
    );
    expect(result).toMatchObject({ state: "revisao", ease: 2.35, intervalDays: 12 });
  });

  it("revisao + bom -> interval=ceil(interval*ease), ease inalterado", () => {
    const result = computeNextSchedule(
      card({ state: "revisao", intervalDays: 10, ease: 2.5 }),
      "bom",
    );
    expect(result).toMatchObject({ state: "revisao", ease: 2.5, intervalDays: 25 });
  });

  it("revisao + facil -> ease+=0.15, interval=ceil(interval*ease*1.3)", () => {
    const result = computeNextSchedule(
      card({ state: "revisao", intervalDays: 10, ease: 2.5 }),
      "facil",
    );
    expect(result).toMatchObject({ state: "revisao", ease: 2.65, intervalDays: 33 });
  });

  it("revisao + facil respeita o teto de ease 5.00", () => {
    const result = computeNextSchedule(
      card({ state: "revisao", intervalDays: 10, ease: 4.95 }),
      "facil",
    );
    expect(result.ease).toBe(5.0);
  });

  it("respeita o teto de intervalo de 36500 dias mesmo em composição extrema", () => {
    const result = computeNextSchedule(
      card({ state: "revisao", intervalDays: 30000, ease: 5.0 }),
      "facil",
    );
    expect(result.intervalDays).toBe(36500);
  });
});
