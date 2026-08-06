import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreferences } from "@/hooks/use-preferences";
import { LessonPicker } from "./lesson-picker";
import { formatSeconds } from "./format";
import { computePomodoroState, type PomodoroPhase } from "./pomodoro-engine";
import { useElapsedSeconds } from "./use-elapsed-seconds";
import { useCreateStudySession, useFinishStudySession } from "./hooks";
import { initialDetailsForMethod } from "./schema";
import type { PomodoroDetails, StudySessionRow } from "./types";

const PHASE_LABELS: Record<PomodoroPhase, string> = {
  foco: "Foco",
  pausa_curta: "Pausa curta",
  pausa_longa: "Pausa longa",
};

interface PomodoroSessionProps {
  resumingSession: StudySessionRow | null;
  onDone: () => void;
  plannedId?: string;
}

export function PomodoroSession({ resumingSession, onDone, plannedId }: PomodoroSessionProps) {
  const [session, setSession] = useState<StudySessionRow | null>(resumingSession);
  const [lessonId, setLessonId] = useState<string | null>(resumingSession?.lesson_id ?? null);
  const { data: prefs, isLoading: prefsLoading } = usePreferences();
  const createSession = useCreateStudySession();

  async function handleStart() {
    try {
      const created = await createSession.mutateAsync({
        method: "pomodoro",
        lessonId,
        details: initialDetailsForMethod("pomodoro"),
      });
      setSession(created);
    } catch (err) {
      console.error("[study-sessions] falha ao iniciar pomodoro", err);
      toast.error("Não foi possível iniciar a sessão");
    }
  }

  if (!session) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
        <LessonPicker value={lessonId} onChange={setLessonId} />
        <Button
          onClick={() => void handleStart()}
          disabled={createSession.isPending}
          className="w-full"
        >
          Iniciar Pomodoro
        </Button>
      </div>
    );
  }

  if (prefsLoading || !prefs) {
    return <Skeleton className="h-48 w-full" />;
  }

  return <PomodoroRunner session={session} prefs={prefs} onDone={onDone} plannedId={plannedId} />;
}

function PomodoroRunner({
  session,
  prefs,
  onDone,
  plannedId,
}: {
  session: StudySessionRow;
  prefs: {
    pomodoro_focus_minutes: number;
    pomodoro_short_break_minutes: number;
    pomodoro_long_break_minutes: number;
    pomodoro_cycles: number;
  };
  onDone: () => void;
  plannedId?: string;
}) {
  const elapsed = useElapsedSeconds(session.started_at);
  const finishSession = useFinishStudySession(session.id, session.started_at, plannedId);
  const finishedRef = useRef(false);

  const state = computePomodoroState(elapsed, {
    focusMinutes: prefs.pomodoro_focus_minutes,
    shortBreakMinutes: prefs.pomodoro_short_break_minutes,
    longBreakMinutes: prefs.pomodoro_long_break_minutes,
    cycles: prefs.pomodoro_cycles,
  });

  useEffect(() => {
    if (state.isComplete && !finishedRef.current) {
      finishedRef.current = true;
      const details: PomodoroDetails = { cycles_completed: state.cyclesCompleted };
      finishSession.mutate(details, {
        onSuccess: () => {
          toast.success(`Pomodoro concluído — ${state.cyclesCompleted} ciclos`);
          onDone();
        },
        onError: (err) => {
          console.error("[study-sessions] falha ao concluir pomodoro automaticamente", err);
          toast.error("Não foi possível concluir a sessão automaticamente");
          finishedRef.current = false;
        },
      });
    }
  }, [state.isComplete, state.cyclesCompleted, finishSession, onDone]);

  async function handleFinishNow() {
    const details: PomodoroDetails = { cycles_completed: state.cyclesCompleted };
    try {
      await finishSession.mutateAsync(details);
      toast.success("Sessão encerrada");
      onDone();
    } catch (err) {
      console.error("[study-sessions] falha ao encerrar pomodoro", err);
      toast.error("Não foi possível encerrar a sessão");
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-6 text-center">
      <div className="flex items-center justify-between text-left">
        <p className="text-sm text-muted-foreground">
          Ciclo {state.cycleNumber}/{prefs.pomodoro_cycles} · {state.cyclesCompleted} concluído
          {state.cyclesCompleted === 1 ? "" : "s"}
        </p>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Sair sem finalizar
        </Button>
      </div>

      <p className="text-sm font-medium text-primary">{PHASE_LABELS[state.phase]}</p>
      <p className="text-5xl font-semibold tabular-nums text-foreground">
        {formatSeconds(state.secondsLeftInPhase)}
      </p>

      <Button
        variant="outline"
        onClick={() => void handleFinishNow()}
        disabled={finishSession.isPending}
      >
        Finalizar agora
      </Button>
    </div>
  );
}
