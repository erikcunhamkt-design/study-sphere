import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LessonPicker } from "./lesson-picker";
import { useCreateStudySession, useFinishStudySession } from "./hooks";
import { initialDetailsForMethod } from "./schema";
import { useUnsavedTextWarning } from "./use-unsaved-warning";
import type { CornellDetails, StudySessionRow } from "./types";

interface CornellSessionProps {
  resumingSession: StudySessionRow | null;
  onDone: () => void;
}

export function CornellSession({ resumingSession, onDone }: CornellSessionProps) {
  const [session, setSession] = useState<StudySessionRow | null>(resumingSession);
  const [lessonId, setLessonId] = useState<string | null>(resumingSession?.lesson_id ?? null);
  const [notas, setNotas] = useState("");
  const [pistas, setPistas] = useState("");
  const [resumo, setResumo] = useState("");
  const createSession = useCreateStudySession();
  const finishSession = useFinishStudySession(session?.id ?? "", session?.started_at ?? "");

  const isDirty = notas.trim().length > 0 || pistas.trim().length > 0 || resumo.trim().length > 0;
  useUnsavedTextWarning(!!session && isDirty);

  async function handleStart() {
    try {
      const created = await createSession.mutateAsync({
        method: "cornell",
        lessonId,
        details: initialDetailsForMethod("cornell"),
      });
      setSession(created);
    } catch (err) {
      console.error("[study-sessions] falha ao iniciar sessão Cornell", err);
      toast.error("Não foi possível iniciar a sessão");
    }
  }

  async function handleFinish() {
    const details: CornellDetails = {
      notas: notas.trim(),
      pistas: pistas.trim(),
      resumo: resumo.trim(),
    };
    try {
      await finishSession.mutateAsync(details);
      toast.success("Sessão concluída");
      onDone();
    } catch (err) {
      console.error("[study-sessions] falha ao concluir sessão Cornell", err);
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
          Começar anotações Cornell
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onDone}>
          Sair sem finalizar
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cornell-notas">Notas</Label>
        <Textarea
          id="cornell-notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={8}
          maxLength={20000}
          placeholder="Anotações principais durante o estudo"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cornell-pistas">Pistas</Label>
        <Textarea
          id="cornell-pistas"
          value={pistas}
          onChange={(e) => setPistas(e.target.value)}
          rows={4}
          maxLength={20000}
          placeholder="Palavras-chave e perguntas para revisar depois"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cornell-resumo">Resumo</Label>
        <Textarea
          id="cornell-resumo"
          value={resumo}
          onChange={(e) => setResumo(e.target.value)}
          rows={4}
          maxLength={20000}
          placeholder="Resuma o conteúdo em poucas frases"
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
