import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  const [optimisticStart, setOptimisticStart] = useState<string | null>(null);
  const createSession = useCreateStudySession();
  const finishSession = useFinishStudySession(session?.id ?? "", session?.started_at ?? "", plannedId);
  // Ancora no início MAIS CEDO: o started_at do servidor pode vir à frente do relógio
  // do cliente e, sozinho, congelaria o contador em 00:00 (clamp Math.max(0) do
  // useElapsedSeconds) até o relógio local alcançá-lo. Usar o menor dos dois mantém a
  // contagem contínua desde o clique.
  const clockAnchor = (() => {
    const candidates = [optimisticStart, session?.started_at].filter(
      (v): v is string => !!v,
    );
    if (candidates.length === 0) return NO_SESSION_ISO;
    return candidates.reduce((earliest, cur) =>
      new Date(cur).getTime() < new Date(earliest).getTime() ? cur : earliest,
    );
  })();

  const elapsed = useElapsedSeconds(clockAnchor);

  useUnsavedTextWarning(!!session && texto.trim().length > 0);

  async function handleStart() {
    setOptimisticStart(new Date().toISOString());
    try {
      const created = await createSession.mutateAsync({
        method: "blurting",
        lessonId,
        details: initialDetailsForMethod("blurting"),
      });
      setSession(created);
    } catch (err) {
      setOptimisticStart(null);
      console.error("[study-sessions] falha ao iniciar sessão de blurting", err);
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

  if (!session && !optimisticStart) {
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
          {createSession.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Iniciando...
            </>
          ) : (
            "Começar blurting"
          )}
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
        disabled={finishSession.isPending || !session}
        className="w-full"
      >
        Concluir
      </Button>
    </div>
  );
}
