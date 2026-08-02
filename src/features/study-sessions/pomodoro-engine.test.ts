import { describe, expect, it } from "vitest";

import { computePomodoroState, type PomodoroPrefsMinutes } from "./pomodoro-engine";

const DEFAULT_PREFS: PomodoroPrefsMinutes = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cycles: 4,
};

describe("computePomodoroState", () => {
  it("começa em foco, ciclo 1, sem nada concluído", () => {
    const state = computePomodoroState(0, DEFAULT_PREFS);
    expect(state).toMatchObject({
      phase: "foco",
      cycleNumber: 1,
      cyclesCompleted: 0,
      secondsLeftInPhase: 25 * 60,
      phaseDurationSeconds: 25 * 60,
      isComplete: false,
    });
  });

  it("conta o tempo restante dentro da fase", () => {
    const state = computePomodoroState(750, DEFAULT_PREFS);
    expect(state.phase).toBe("foco");
    expect(state.secondsLeftInPhase).toBe(25 * 60 - 750);
  });

  it("passa para pausa curta ao concluir o primeiro foco, contando o ciclo", () => {
    const state = computePomodoroState(25 * 60, DEFAULT_PREFS);
    expect(state.phase).toBe("pausa_curta");
    expect(state.cycleNumber).toBe(1);
    expect(state.cyclesCompleted).toBe(1);
    expect(state.secondsLeftInPhase).toBe(5 * 60);
  });

  it("volta para foco no segundo ciclo após a pausa curta", () => {
    const elapsed = 25 * 60 + 5 * 60;
    const state = computePomodoroState(elapsed, DEFAULT_PREFS);
    expect(state.phase).toBe("foco");
    expect(state.cycleNumber).toBe(2);
    expect(state.cyclesCompleted).toBe(1);
  });

  it("usa pausa longa (não curta) depois do último ciclo de foco", () => {
    // 3 ciclos completos de foco+pausa_curta, mais o 4º foco:
    const elapsed = 3 * (25 * 60 + 5 * 60) + 25 * 60;
    const state = computePomodoroState(elapsed, DEFAULT_PREFS);
    expect(state.phase).toBe("pausa_longa");
    expect(state.cycleNumber).toBe(4);
    expect(state.cyclesCompleted).toBe(4);
    expect(state.secondsLeftInPhase).toBe(15 * 60);
  });

  it("marca isComplete só depois da pausa longa terminar", () => {
    const totalSequenceSeconds = 4 * 25 * 60 + 3 * 5 * 60 + 15 * 60;
    const almostDone = computePomodoroState(totalSequenceSeconds - 1, DEFAULT_PREFS);
    expect(almostDone.isComplete).toBe(false);

    const done = computePomodoroState(totalSequenceSeconds, DEFAULT_PREFS);
    expect(done.isComplete).toBe(true);
    expect(done.cyclesCompleted).toBe(4);

    const wellPastDone = computePomodoroState(totalSequenceSeconds + 999, DEFAULT_PREFS);
    expect(wellPastDone.isComplete).toBe(true);
    expect(wellPastDone.cyclesCompleted).toBe(4);
  });

  it("com 1 ciclo, não existe pausa curta — só foco e pausa longa", () => {
    const prefs: PomodoroPrefsMinutes = { ...DEFAULT_PREFS, cycles: 1 };
    const afterFocus = computePomodoroState(25 * 60, prefs);
    expect(afterFocus.phase).toBe("pausa_longa");

    const complete = computePomodoroState(25 * 60 + 15 * 60, prefs);
    expect(complete.isComplete).toBe(true);
    expect(complete.cyclesCompleted).toBe(1);
  });

  it("nunca deixa secondsLeftInPhase negativo mesmo com elapsed negativo (defesa extra)", () => {
    const state = computePomodoroState(-100, DEFAULT_PREFS);
    expect(state.secondsLeftInPhase).toBeLessThanOrEqual(state.phaseDurationSeconds);
    expect(state.secondsLeftInPhase).toBeGreaterThanOrEqual(0);
  });
});
