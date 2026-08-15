import { useState, useMemo, useEffect } from "react";
import { Brain, ArrowRight, CheckCircle2, ChevronRight, Loader2, Clock, Send, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useCreateStudySession, useFinishStudySession, useRecordRecallAttempt } from "../../hooks";
import { useQuestions } from "@/features/questions/hooks";
import { useLessonDocument } from "@/features/lesson-editor/hooks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { RecallResult, RecuperacaoDetails, StudySessionRow } from "../../types";

interface ReviewSessionProps {
  concepts: any[];
  onDone: () => void;
}

export function ReviewSession({ concepts, onDone }: ReviewSessionProps) {
  const { user } = useAuth();
  const [session, setSession] = useState<StudySessionRow | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [isRevealed, setIsRevealed] = useState(false);
  const [attempts, setAttempts] = useState<RecuperacaoDetails["questionAttempts"]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());

  const { data: allQuestions, isLoading: isLoadingQuestions } = useQuestions();
  const createSession = useCreateStudySession();
  const finishSession = useFinishStudySession(session?.id ?? "", session?.started_at ?? "");
  const recordAttempt = useRecordRecallAttempt();

  // Filtrar apenas o primeiro formato disponível para cada conceito (Regra 20)
  // E apenas conceitos que possuam ao menos uma pergunta (Regra 19)
  const reviewQueue = useMemo(() => {
    if (!allQuestions || !concepts) return [];
    
    return concepts.map(c => {
      if (!allQuestions) return null;
      const questions = allQuestions.filter(q => (q as any).concept_id === c.concept_id && !q.is_archived);
      if (questions.length === 0) return null;
      
      const bestQuestion = questions[0]; 
      return {
        concept: c.concept,
        conceptId: c.concept_id,
        question: bestQuestion,
        memoryState: c
      };
    }).filter(Boolean) as any[];
  }, [concepts, allQuestions]);

  const currentItem = reviewQueue[currentIndex];

  useEffect(() => {
    if (!session && !createSession.isPending && reviewQueue.length > 0) {
      const start = async () => {
        try {
          const newSession = await createSession.mutateAsync({
            method: "recuperacao",
            lessonId: null, // Sessão de revisão global
            isFreeSession: false,
            details: {
              questionAttempts: [],
              lessonId: "",
            } as any
          });
          setSession(newSession);
          setStartTime(Date.now());
        } catch (err) {
          toast.error("Erro ao iniciar sessão");
          onDone();
        }
      };
      start();
    }
  }, [session, reviewQueue.length]);

  const handleReveal = () => {
    if (!response.trim()) {
      toast.error("Escreva algo primeiro.");
      return;
    }
    setIsRevealed(true);
  };

  const handleAssess = async (confidence: number) => {
    if (!session || !currentItem) return;
    
    const durationMs = Date.now() - startTime;
    
    // Mapeamento FSRS Core (Regra 13 e 16)
    let result: RecallResult = "self_reported_correct";
    if (confidence === 1) result = "self_reported_incorrect";
    else if (confidence === 2) result = "self_reported_partial";

    try {
      // Registrar evidência imutável (Regra 26 e 29)
      const evidenceId = await recordAttempt.mutateAsync({
        sessionId: session.id,
        questionId: currentItem.question.id,
        response: response.trim(),
        result,
        resultSource: "self_assessment",
        confidence,
        responseTimeMs: durationMs,
        publishedVersion: null // Revisão global
      });

      const newAttempt = {
        questionId: currentItem.question.id,
        evidenceId,
        response: response.trim(),
        result: result as any,
        confidence,
        responseTimeMs: durationMs,
        attemptedAt: new Date().toISOString()
      };

      const updatedAttempts = [...attempts, newAttempt];
      setAttempts(updatedAttempts);

      if (currentIndex < reviewQueue.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setResponse("");
        setIsRevealed(false);
        setStartTime(Date.now());
      } else {
        // Finalizar sessão (Regra 22 e 27)
        await finishSession.mutateAsync({
          questionAttempts: updatedAttempts,
          completedAt: new Date().toISOString()
        } as any);
        setIsFinished(true);
      }
    } catch (err) {
      toast.error("Erro ao salvar revisão");
    }
  };

  if (isLoadingQuestions || (reviewQueue.length > 0 && !session)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Preparando cockpit de memória...</p>
      </div>
    );
  }

  if (reviewQueue.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-8 animate-in fade-in duration-700">
        <div className="w-20 h-20 rounded-[2rem] bg-surface/40 border border-border/20 flex items-center justify-center mx-auto text-muted-foreground/20">
          <Brain className="h-10 w-10" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-black tracking-tight text-foreground uppercase italic">Nada para revisar</h2>
          <p className="text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed">
            Seus conceitos devidos não possuem perguntas configuradas para recuperação.
          </p>
        </div>
        <Button onClick={onDone} variant="outline" className="h-14 px-8 rounded-full border-border/40 font-black uppercase tracking-widest text-[10px]">
          Voltar
        </Button>
      </div>
    );
  }

  if (isFinished) {
    const successCount = attempts.filter(a => a.result.includes("correct")).length;
    
    return (
      <div className="max-w-2xl mx-auto text-center space-y-12 py-10 animate-in fade-in duration-700">
        <div className="space-y-6">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <div className="relative w-24 h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl font-black tracking-tight text-foreground uppercase italic">Revisão Concluída</h2>
            <p className="text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
              {attempts.length} conceitos recuperados. O motor FSRS já atualizou seu cronograma de memória.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-surface/30 border border-border/10 rounded-[2.5rem] p-8 text-left space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">Recuperação</span>
            <p className="text-4xl font-black text-foreground italic">{successCount} / {attempts.length}</p>
            <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">Conceitos consolidados</p>
          </div>
          <div className="bg-surface/30 border border-border/10 rounded-[2.5rem] p-8 text-left space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40">Status final</span>
            <p className="text-2xl font-black text-foreground uppercase italic">Tudo em dia</p>
            <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">Memória em estado estável</p>
          </div>
        </div>

        <Button onClick={onDone} className="h-16 px-12 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-[0_0_40px_-10px_rgba(217,0,110,0.5)] transition-all uppercase italic">
          Concluir <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-500">
      {/* Cockpit de Foco (Regra 33) */}
      <div className="flex items-center justify-between mb-16 border-b border-border/10 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div className="text-left space-y-0.5">
            <h1 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/80 italic">Modo Revisão</h1>
            <div className="flex items-center gap-2">
               <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Recuperação ativa</span>
               <span className="w-1 h-1 rounded-full bg-primary/30" />
               <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">{currentItem?.concept?.title || 'Conceito'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="text-right hidden sm:block">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">Progresso</p>
            <p className="text-lg font-black tabular-nums text-primary italic leading-none">{currentIndex + 1} / {reviewQueue.length}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onDone} className="h-10 px-4 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-foreground hover:bg-surface/40 transition-all">
            Abandonar
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-12">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10">
               <Sparkles className="w-2.5 h-2.5 text-primary" />
               <span className="text-[8px] font-black uppercase tracking-widest text-primary">Pergunta</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground leading-tight italic">
              {currentItem?.question.statement}
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground/20 uppercase tracking-[0.2em] italic">O que você lembra sobre isso?</p>
          </div>

          {!isRevealed ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                autoFocus
                placeholder="Escreva sua resposta de recuperação..."
                className="min-h-[250px] rounded-[2.5rem] bg-surface/20 border-border/40 focus:border-primary/40 focus:ring-primary/10 text-lg p-8 resize-none transition-all placeholder:text-muted-foreground/10 font-medium"
              />
              <Button 
                onClick={handleReveal}
                disabled={!response.trim()}
                className="w-full h-20 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-xl shadow-[0_0_40px_-10px_rgba(217,0,110,0.4)] transition-all group italic"
              >
                RESPONDER <ArrowRight className="ml-2 h-6 w-6 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          ) : (
            <div className="space-y-12 animate-in fade-in duration-700">
              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60">Gabarito esperado</span>
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] p-8 text-foreground/80 font-medium leading-relaxed text-lg italic">
                    {currentItem?.question.expected_answer || "Reforce este conceito com base na sua lembrança."}
                  </div>
                </div>
                
                <div className="space-y-4 opacity-60">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">Sua tentativa</span>
                  <div className="bg-surface/40 border border-border/20 rounded-[2.5rem] p-8 text-foreground/70 font-medium italic italic">
                    "{response}"
                  </div>
                </div>
              </div>

              <div className="space-y-8 pt-8 border-t border-border/10">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic">Como foi sua lembrança?</h3>
                  <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">Seja honesto com sua memória</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { level: 1, label: "Não sabia", color: "hover:bg-red-500/10 hover:border-red-500/20" },
                    { level: 2, label: "Dificuldade", color: "hover:bg-orange-500/10 hover:border-orange-500/20" },
                    { level: 3, label: "Lembrei", color: "hover:bg-blue-500/10 hover:border-blue-500/20" },
                    { level: 4, label: "Facilidade", color: "hover:bg-emerald-500/10 hover:border-emerald-500/20" }
                  ].map((btn) => (
                    <Button
                      key={btn.level}
                      variant="outline"
                      onClick={() => handleAssess(btn.level)}
                      className={cn(
                        "h-24 flex-col rounded-[2rem] border-border/40 font-black uppercase tracking-tighter text-[10px] transition-all gap-2 italic",
                        btn.color
                      )}
                    >
                      {btn.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
