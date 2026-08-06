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
import type { BlurtingDetails, StudySessionRow } from "./types";

interface BlurtingSessionProps {
  resumingSession: StudySessionRow | null;
  onDone: () => void;
  plannedId?: string;
}

/** Fallback estável para useElapsedSeconds antes de a sessão existir — nunca exibido (o timer só aparece depois do INSERT). */
const NO_SESSION_ISO = new Date(0).toISOString();

export function BlurtingSession({ resumingSession, onDone, plannedId }: BlurtingSessionProps) {
  const [session, setSession] = useState<StudySessionRow | null>(resumingSession);
  const [lessonId, setLessonId] = useState<string | null>(resumingSession?.lesson_id ?? null);
  const [texto, setTexto] = useState("");
  const createSession = useCreateStudySession();
  const finishSession = useFinishStudySession(session?.id ?? "", session?.started_at ?? "", plannedId);
  const elapsed = useElapsedSeconds(session?.started_at ?? NO_SESSION_ISO);

  useUnsavedTextWarning(!!session && texto.trim().length > 0);

  async function handleStart() {
    try {
      const created = await createSession.mutateAsync({
        method: "blurting",
        lessonId,
        details: initialDetailsForMethod("blurting"),
      });
      setSession(created);
    } catch (err) {
      console.error("[study-sessions] falha ao iniciar blurting", err);
      toast.error("Não foi possível iniciar a sessão");
    }
  }

  async function handleFinish() {
    const details: BlurtingDetails = { texto: texto.trim() };
    try {
      await finishSession.mutateAsync(details);
      toast.success("Sessão concluída");
      onDone();
    } catch (err) {
      console.error("[study-sessions] falha ao concluir blurting", err);
      toast.error("Não foi possível concluir a sessão");
    }
  }

  if (!session) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
        <p className="text-sm text-muted-foreground">
          Escreva livremente tudo o que você lembra sobre o assunto, sem consultar nada, até o tempo
          acabar.
        </p>
        <LessonPicker value={lessonId} onChange={setLessonId} />
        <Button
          onClick={() => void handleStart()}
          disabled={createSession.isPending}
          className="w-full"
        >
          Começar blurting
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
      <Label htmlFor="blurting-texto">O que você lembra?</Label>
      <Textarea
        id="blurting-texto"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={10}
        maxLength={20000}
        placeholder="Escreva sem parar..."
      />
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
