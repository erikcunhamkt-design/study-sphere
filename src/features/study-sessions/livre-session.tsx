import { useState } from "react";
import { toast } from "sonner";
import { Loader2, BookOpen, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LessonPicker } from "./lesson-picker";
import { formatSeconds } from "./format";
import { useCreateStudySession, useFinishStudySession } from "./hooks";
import { initialDetailsForMethod } from "./schema";
import { useElapsedSeconds } from "./use-elapsed-seconds";
import { useUnsavedTextWarning } from "./use-unsaved-warning";
import type { LivreDetails, StudySessionRow, StudyMethod } from "./types";

interface LivreSessionProps {
  resumingSession: StudySessionRow | null;
  onDone: () => void;
  plannedId?: string;
  method?: StudyMethod;
}

/** Fallback estável para useElapsedSeconds antes de a sessão existir — nunca exibido (o timer só aparece depois do INSERT). */
const NO_SESSION_ISO = new Date(0).toISOString();

export function LivreSession({ resumingSession, onDone, plannedId, method = "livre" }: LivreSessionProps) {
  const [session, setSession] = useState<StudySessionRow | null>(resumingSession);
  const [lessonId, setLessonId] = useState<string | null>(resumingSession?.lesson_id ?? null);
  const [nota, setNota] = useState("");
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

  useUnsavedTextWarning(!!session && nota.trim().length > 0);

  async function handleStart() {
    setOptimisticStart(new Date().toISOString());
    try {
      const created = await createSession.mutateAsync({
        method: method,
        lessonId,
        isFreeSession: !lessonId,
        details: initialDetailsForMethod(method),
      });
      setSession(created);
    } catch (err) {
      setOptimisticStart(null);
      console.error(`[study-sessions] falha ao iniciar sessão ${method}`, err);
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

  if (!session && !optimisticStart) {
    return (
      <div className="space-y-6 rounded-[2rem] border border-border/40 bg-surface/20 p-8 md:p-10">
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">
            {method === "aprender" ? "O que você vai aprender?" : "O que você quer estudar?"}
          </h3>
          <LessonPicker value={lessonId} onChange={setLessonId} />
        </div>
        <Button
          onClick={() => void handleStart()}
          disabled={createSession.isPending}
          size="lg"
          className="w-full h-16 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-[0_0_40px_-10px_rgba(217,0,110,0.3)] transition-transform active:scale-95"
        >
          {createSession.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden />
              Iniciando...
            </>
          ) : (
            method === "aprender" ? "Iniciar Aprendizado →" : "Iniciar Sessão Livre →"
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
              {method === "aprender" ? (
                <><BookOpen className="h-3 w-3" /> Aprender</>
              ) : "Estudo Livre"}
            </span>
            <p className="text-[10px] font-bold tabular-nums text-muted-foreground/40 uppercase tracking-widest">
              {formatSeconds(elapsed)} decorridos
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onDone} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-primary">
            Sair sem salvar
          </Button>
        </div>

        <div className="space-y-4">
          <Label htmlFor="livre-nota" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">
            {method === "aprender" ? "Anotações do Aprendizado" : "Nota da Sessão (opcional)"}
          </Label>
          <Textarea
            id="livre-nota"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder={method === "aprender" ? "O que você está descobrindo agora?" : "O que você está estudando agora?"}
            className="min-h-[160px] rounded-2xl border-border/40 bg-surface/40 focus:bg-surface/60 transition-colors text-base font-medium resize-none p-6"
            maxLength={20000}
          />
        </div>

        <Button
          onClick={() => void handleFinish()}
          disabled={finishSession.isPending || !session}
          size="lg"
          className="w-full h-16 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-[0_0_40px_-10px_rgba(217,0,110,0.3)] transition-transform active:scale-95"
        >
          Concluir Estudo
        </Button>
      </div>
    </div>
  );
}
