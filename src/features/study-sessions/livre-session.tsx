import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LessonPicker } from "./lesson-picker";
import { formatSeconds } from "./format";
import { useCreateStudySession, useFinishStudySession } from "./hooks";
import { initialDetailsForMethod } from "./schema";
import { useElapsedSeconds } from "./use-elapsed-seconds";
import { useUnsavedTextWarning } from "./use-unsaved-warning";
import type { LivreDetails, StudySessionRow } from "./types";

interface LivreSessionProps {
  resumingSession: StudySessionRow | null;
  onDone: () => void;
  plannedId?: string;
}

/** Fallback estável para useElapsedSeconds antes de a sessão existir — nunca exibido (o timer só aparece depois do INSERT). */
const NO_SESSION_ISO = new Date(0).toISOString();

export function LivreSession({ resumingSession, onDone, plannedId }: LivreSessionProps) {
  const [session, setSession] = useState<StudySessionRow | null>(resumingSession);
  const [lessonId, setLessonId] = useState<string | null>(resumingSession?.lesson_id ?? null);
  const [nota, setNota] = useState("");
  const createSession = useCreateStudySession();
  const finishSession = useFinishStudySession(session?.id ?? "", session?.started_at ?? "", plannedId);
  const elapsed = useElapsedSeconds(session?.started_at ?? NO_SESSION_ISO);

  useUnsavedTextWarning(!!session && nota.trim().length > 0);

  async function handleStart() {
    try {
      const created = await createSession.mutateAsync({
        method: "livre",
        lessonId,
        details: initialDetailsForMethod("livre"),
      });
      setSession(created);
    } catch (err) {
      console.error("[study-sessions] falha ao iniciar sessão livre", err);
      toast.error("Não foi possível iniciar a sessão");
    }
  }

  async function handleFinish() {
    const details: LivreDetails = nota.trim() ? { nota: nota.trim() } : {};
    try {
      await finishSession.mutateAsync(details);
      toast.success("Sessão concluída");
      onDone();
    } catch (err) {
      console.error("[study-sessions] falha ao concluir sessão livre", err);
      toast.error("Não foi possível concluir a sessão");
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
          Iniciar sessão livre
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium tabular-nums text-foreground">
          {formatSeconds(elapsed)} decorridos
        </p>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Sair sem finalizar
        </Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="livre-nota">Nota (opcional)</Label>
        <Textarea
          id="livre-nota"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={4}
          maxLength={20000}
        />
      </div>
      <Button
        onClick={() => void handleFinish()}
        disabled={finishSession.isPending}
        className="w-full"
      >
        Concluir
      </Button>
    </div>
  );
}
