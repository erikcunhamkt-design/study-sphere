import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LessonPicker } from "./lesson-picker";
import { useCreateStudySession, useFinishStudySession } from "./hooks";
import { initialDetailsForMethod } from "./schema";
import { useUnsavedTextWarning } from "./use-unsaved-warning";
import type { FeynmanDetails, StudySessionRow } from "./types";

interface FeynmanSessionProps {
  resumingSession: StudySessionRow | null;
  onDone: () => void;
  plannedId?: string;
}

export function FeynmanSession({ resumingSession, onDone, plannedId }: FeynmanSessionProps) {
  const [session, setSession] = useState<StudySessionRow | null>(resumingSession);
  const [lessonId, setLessonId] = useState<string | null>(resumingSession?.lesson_id ?? null);
  const [explicacao, setExplicacao] = useState("");
  const createSession = useCreateStudySession();
  const finishSession = useFinishStudySession(session?.id ?? "", session?.started_at ?? "", plannedId);

  useUnsavedTextWarning(!!session && explicacao.trim().length > 0);

  async function handleStart() {
    try {
      const created = await createSession.mutateAsync({
        method: "feynman",
        lessonId,
        isFreeSession: !lessonId,
        details: initialDetailsForMethod("feynman"),
      });
      setSession(created);
    } catch (err) {
      console.error("[study-sessions] falha ao iniciar sessão de Feynman", err);
      toast.error("Não foi possível iniciar a sessão");
    }
  }

  async function handleFinish() {
    const details: FeynmanDetails = { explicacao: explicacao.trim() };
    try {
      await finishSession.mutateAsync(details);
      toast.success("Sessão concluída");
      onDone();
    } catch (err) {
      console.error("[study-sessions] falha ao concluir sessão de Feynman", err);
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
          {createSession.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Iniciando...
            </>
          ) : (
            "Começar explicação"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="feynman-explicacao">
          Explique como se estivesse ensinando alguém que não sabe nada do assunto
        </Label>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Sair sem finalizar
        </Button>
      </div>
      <Textarea
        id="feynman-explicacao"
        value={explicacao}
        onChange={(e) => setExplicacao(e.target.value)}
        rows={10}
        maxLength={20000}
        placeholder="Escreva a explicação com suas próprias palavras..."
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
