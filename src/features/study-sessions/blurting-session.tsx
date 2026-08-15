import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Zap, Clock, ChevronRight } from "lucide-react";

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

const NO_SESSION_ISO = new Date(0).toISOString();

export function BlurtingSession({ resumingSession, onDone, plannedId }: BlurtingSessionProps) {
  const [session, setSession] = useState<StudySessionRow | null>(resumingSession);
  const [lessonId, setLessonId] = useState<string | null>(resumingSession?.lesson_id ?? null);
  const [texto, setTexto] = useState("");
  const [optimisticStart, setOptimisticStart] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const createSession = useCreateStudySession();
  const finishSession = useFinishStudySession(session?.id ?? "", session?.started_at ?? "", plannedId);

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

  useUnsavedTextWarning(!!session && texto.trim().length > 0 && !isFinished);

  async function handleStart() {
    setOptimisticStart(new Date().toISOString());
    try {
      const created = await createSession.mutateAsync({
        method: "blurting",
        lessonId,
        isFreeSession: !lessonId,
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
      setIsFinished(true);
    } catch (err) {
      console.error("[study-sessions] falha ao concluir blurting", err);
      toast.error("Não foi possível concluir a sessão");
    }
  }

  if (isFinished) {
    return (
      <div className="group relative overflow-hidden rounded-[2.5rem] border border-primary/20 bg-surface/30 p-10 md:p-16 text-center animate-in fade-in zoom-in duration-700">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 space-y-10">
          <div className="mx-auto w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
            <Zap className="h-12 w-12" />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground uppercase">
              Recuperação Concluída
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground/60 max-w-2xl mx-auto font-medium">
              Você forçou seu cérebro a recuperar a informação. Esse esforço é o que cria a memória.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              onClick={onDone}
              size="lg"
              className="h-16 px-10 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-[0_0_40px_-10px_rgba(217,0,110,0.3)] transition-transform hover:scale-105 active:scale-95"
            >
              Testar memória <ChevronRight className="ml-2 h-6 w-6" />
            </Button>
            <Button 
              variant="ghost" 
              onClick={onDone}
              className="text-xs font-black uppercase tracking-widest text-muted-foreground/40 hover:text-foreground"
            >
              Voltar ao hub
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!session && !optimisticStart) {
    return (
      <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="rounded-[2.5rem] border border-border/40 bg-surface/20 p-8 md:p-12 space-y-10 text-center">
          <div className="space-y-4">
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 ml-1">
              O que você vai recuperar?
            </h3>
            <div className="max-w-md mx-auto text-left">
              <LessonPicker value={lessonId} onChange={setLessonId} />
            </div>
          </div>
          
          <Button
            onClick={() => void handleStart()}
            disabled={createSession.isPending}
            size="lg"
            className="w-full max-w-md h-16 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-[0_0_40px_-10px_rgba(217,0,110,0.3)] transition-all active:scale-95"
          >
            {createSession.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden />
                Iniciando...
              </>
            ) : (
              "Começar blurting →"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-700">
      <div className="group relative overflow-hidden rounded-[2.5rem] border border-primary/20 bg-surface/30 p-8 md:p-12 transition-all">
        <div className="absolute -right-20 -top-20 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 space-y-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/10 pb-8">
            <div className="space-y-2 text-left">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest">
                  <Zap className="h-3 w-3" /> MODO BLURTING
                </span>
                <span className="text-[10px] font-bold tabular-nums text-muted-foreground/40 uppercase tracking-widest">
                  <Clock className="h-3 w-3 inline mr-1.5" /> {formatSeconds(elapsed)}
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tighter text-foreground/90 uppercase">
                {session?.lesson_id ? "Aula em foco" : "Sessão Independente"}
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onDone} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/20 hover:text-red-500 hover:bg-red-500/5 transition-all">
              Sair sem salvar
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-6">
              <div className="space-y-4">
                <Label htmlFor="blurting-texto" className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 ml-1">
                  O que você lembra? (Escreva sem consultar)
                </Label>
                <Textarea
                  id="blurting-texto"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Escreva sem parar tudo o que vier à cabeça sobre o assunto..."
                  className="min-h-[400px] rounded-3xl border-border/20 bg-surface/40 focus:bg-surface/60 transition-all text-lg font-medium resize-none p-8 shadow-inner"
                  maxLength={20000}
                />
              </div>
            </div>
            
            <div className="lg:col-span-4 space-y-10">
              <div className="rounded-3xl border border-border/20 bg-surface/20 p-8 space-y-6">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">A Técnica</h4>
                  <p className="text-sm font-bold text-foreground/70 leading-relaxed text-left">
                    O cérebro aprende quando é forçado a lembrar, não quando recebe informação passivamente.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Regras Dominus</h4>
                  <ul className="space-y-3">
                    {['Não consulte o material', 'Não se preocupe com a ordem', 'Escreva até esgotar'].map((tip, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs text-muted-foreground/60 font-medium text-left">
                        <div className="mt-1.5 w-1 h-1 rounded-full bg-primary/40 shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-6">
                <Button
                  onClick={() => void handleFinish()}
                  disabled={finishSession.isPending || !session}
                  size="lg"
                  className="w-full h-20 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-xl shadow-[0_0_50px_-10px_rgba(217,0,110,0.4)] transition-all hover:scale-[1.05] active:scale-95"
                >
                  {finishSession.isPending ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    "Concluir Sessão"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

