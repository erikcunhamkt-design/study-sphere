export type PomodoroPhase = "foco" | "pausa_curta" | "pausa_longa";

export interface PomodoroPrefsMinutes {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cycles: number;
}

export interface PomodoroState {
  phase: PomodoroPhase;
  /** Ciclo de foco atual (1-based) — a fase de pausa após o ciclo N ainda conta como ciclo N. */
  cycleNumber: number;
  /** Quantos ciclos de foco já foram concluídos por inteiro. */
  cyclesCompleted: number;
  secondsLeftInPhase: number;
  phaseDurationSeconds: number;
  /** true depois que a pausa longa do último ciclo termina — a sessão inteira acabou. */
  isComplete: boolean;
}

interface SequenceStep {
  phase: PomodoroPhase;
  durationSeconds: number;
  cycleNumber: number;
}

function buildSequence(prefs: PomodoroPrefsMinutes): SequenceStep[] {
  const sequence: SequenceStep[] = [];
  for (let cycleNumber = 1; cycleNumber <= prefs.cycles; cycleNumber++) {
    sequence.push({ phase: "foco", durationSeconds: prefs.focusMinutes * 60, cycleNumber });
    const isLastCycle = cycleNumber === prefs.cycles;
    sequence.push({
      phase: isLastCycle ? "pausa_longa" : "pausa_curta",
      durationSeconds: (isLastCycle ? prefs.longBreakMinutes : prefs.shortBreakMinutes) * 60,
      cycleNumber,
    });
  }
  return sequence;
}

/**
 * Estado do Pomodoro num instante dado, calculado do zero a partir do
 * tempo decorrido — sem estado incremental. Isso é o que permite retomar
 * uma sessão órfã: basta recalcular com elapsedSeconds = agora -
 * started_at persistido, o mesmo cálculo usado a cada tick de uma sessão
 * ao vivo.
 */
export function computePomodoroState(
  elapsedSeconds: number,
  prefs: PomodoroPrefsMinutes,
): PomodoroState {
  const sequence = buildSequence(prefs);
  let remaining = Math.max(0, Math.floor(elapsedSeconds));
  let cyclesCompleted = 0;

  for (const step of sequence) {
    if (remaining < step.durationSeconds) {
      return {
        phase: step.phase,
        cycleNumber: step.cycleNumber,
        cyclesCompleted,
        secondsLeftInPhase: step.durationSeconds - remaining,
        phaseDurationSeconds: step.durationSeconds,
        isComplete: false,
      };
    }
    remaining -= step.durationSeconds;
    if (step.phase === "foco") cyclesCompleted += 1;
  }

  const last = sequence[sequence.length - 1]!;
  return {
    phase: last.phase,
    cycleNumber: last.cycleNumber,
    cyclesCompleted,
    secondsLeftInPhase: 0,
    phaseDurationSeconds: last.durationSeconds,
    isComplete: true,
  };
}
