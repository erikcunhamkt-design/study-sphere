import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
        isFreeSession: !lessonId,
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
          {createSession.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Iniciando...
            </>
          ) : (
            "Iniciar Pomodoro"
          )}
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
    <div className="group relative overflow-hidden rounded-[2rem] border border-primary/20 bg-surface/30 p-8 md:p-12 text-center transition-all">
      <div className="absolute -right-20 -top-20 w-[300px] h-[300px] bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest">
              Ciclo {state.cycleNumber}/{prefs.pomodoro_cycles}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
              {state.cyclesCompleted} concluídos
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onDone} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-primary">
            Sair sem salvar
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary/60">{PHASE_LABELS[state.phase]}</p>
          <p className="text-7xl md:text-8xl font-black tabular-nums tracking-tighter text-foreground drop-shadow-sm">
            {formatSeconds(state.secondsLeftInPhase)}
          </p>
        </div>

        <div className="pt-4">
          <Button
            onClick={() => void handleFinishNow()}
            disabled={finishSession.isPending}
            className="h-14 px-10 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-base shadow-[0_0_40px_-10px_rgba(217,0,110,0.3)] transition-transform active:scale-95"
          >
            Finalizar Sessão
          </Button>
        </div>
      </div>
    </div>
  );
}
