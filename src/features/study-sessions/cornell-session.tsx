import { useState } from "react";
import { toast } from "sonner";
import { Loader2, BookOpen, ChevronRight } from "lucide-react";

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
  plannedId?: string;
}

export function CornellSession({ resumingSession, onDone, plannedId }: CornellSessionProps) {
  const [session, setSession] = useState<StudySessionRow | null>(resumingSession);
  const [lessonId, setLessonId] = useState<string | null>(resumingSession?.lesson_id ?? null);
  const [notas, setNotas] = useState("");
  const [pistas, setPistas] = useState("");
  const [resumo, setResumo] = useState("");
  const [isFinished, setIsFinished] = useState(false);
  const createSession = useCreateStudySession();
  const finishSession = useFinishStudySession(session?.id ?? "", session?.started_at ?? "", plannedId);

  const isDirty = notas.trim().length > 0 || pistas.trim().length > 0 || resumo.trim().length > 0;
  useUnsavedTextWarning(!!session && isDirty && !isFinished);

  async function handleStart() {
    try {
      const created = await createSession.mutateAsync({
        method: "cornell",
        lessonId,
        isFreeSession: !lessonId,
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
      setIsFinished(true);
    } catch (err) {
      console.error("[study-sessions] falha ao concluir sessão Cornell", err);
      toast.error("Não foi possível concluir a sessão");
    }
  }

  if (isFinished) {
    return (
      <div className="group relative overflow-hidden rounded-[2.5rem] border border-primary/20 bg-surface/30 p-10 md:p-16 text-center animate-in fade-in zoom-in duration-700">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 space-y-10">
          <div className="mx-auto w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
            <BookOpen className="h-12 w-12" />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground uppercase">
              Notas Estruturadas
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground/60 max-w-2xl mx-auto font-medium">
              Você organizou o conhecimento em pistas, notas e resumo. Essa estrutura facilita a revisão futura.
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

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="rounded-[2.5rem] border border-border/40 bg-surface/20 p-8 md:p-12 space-y-10 text-center">
          <div className="space-y-4">
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 ml-1">
              Sobre o que são suas notas?
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
              "Começar anotações Cornell →"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="group relative overflow-hidden rounded-[2.5rem] border border-primary/20 bg-surface/30 p-8 md:p-12 transition-all">
        <div className="absolute -right-20 -top-20 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 space-y-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/10 pb-8">
            <div className="space-y-2 text-left">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest">
                  <BookOpen className="h-3 w-3" /> MÉTODO CORNELL
                </span>
                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                  Ação: Anotação estruturada
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

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4 space-y-4">
              <Label htmlFor="cornell-pistas" className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">Pistas & Perguntas</Label>
              <Textarea
                id="cornell-pistas"
                value={pistas}
                onChange={(e) => setPistas(e.target.value)}
                className="min-h-[400px] rounded-3xl border-border/20 bg-surface/40 focus:bg-surface/60 transition-all text-sm font-medium resize-none p-6 shadow-inner"
                placeholder="Identifique palavras-chave e crie perguntas sobre o conteúdo ao lado..."
              />
            </div>
            <div className="md:col-span-8 space-y-4">
              <Label htmlFor="cornell-notas" className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">Notas de Estudo</Label>
              <Textarea
                id="cornell-notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="min-h-[400px] rounded-3xl border-border/20 bg-surface/40 focus:bg-surface/60 transition-all text-lg font-medium resize-none p-8 shadow-inner"
                placeholder="Faça suas anotações principais aqui durante o contato com o material..."
              />
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <Label htmlFor="cornell-resumo" className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">Resumo (O quadro geral)</Label>
            <Textarea
              id="cornell-resumo"
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              className="min-h-[150px] rounded-3xl border-border/20 bg-surface/40 focus:bg-surface/60 transition-all text-lg font-medium resize-none p-8 shadow-inner"
              placeholder="Resuma o conteúdo em poucas frases após terminar as notas..."
            />
          </div>

          <div className="flex justify-center pt-6">
            <Button
              onClick={() => void handleFinish()}
              disabled={finishSession.isPending || !session}
              size="lg"
              className="w-full max-w-md h-20 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-xl shadow-[0_0_50px_-10px_rgba(217,0,110,0.4)] transition-all hover:scale-[1.05] active:scale-95"
            >
              {finishSession.isPending ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                "Finalizar Estruturação"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

