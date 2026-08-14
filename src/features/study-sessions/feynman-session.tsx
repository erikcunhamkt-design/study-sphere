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
    <div className="group relative overflow-hidden rounded-[2rem] border border-primary/20 bg-surface/30 p-8 md:p-10 transition-all">
      <div className="absolute -right-20 -top-20 w-[300px] h-[300px] bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest">
              Método Feynman
            </span>
            <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
              Ação: Explicar conteúdo
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onDone} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-primary">
            Sair sem salvar
          </Button>
        </div>

        <div className="space-y-4">
          <Label htmlFor="feynman-explicacao" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">
            Explique como se estivesse ensinando uma criança
          </Label>
          <Textarea
            id="feynman-explicacao"
            value={explicacao}
            onChange={(e) => setExplicacao(e.target.value)}
            className="min-h-[300px] rounded-2xl border-border/40 bg-surface/40 focus:bg-surface/60 transition-colors text-base font-medium resize-none p-6"
            maxLength={20000}
            placeholder="Escreva a explicação com suas próprias palavras..."
          />
        </div>

        <Button
          onClick={() => void handleFinish()}
          disabled={finishSession.isPending}
          size="lg"
          className="w-full h-16 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-[0_0_40px_-10px_rgba(217,0,110,0.3)] transition-transform active:scale-95"
        >
          Concluir Explicação
        </Button>
      </div>
    </div>
  );
}
