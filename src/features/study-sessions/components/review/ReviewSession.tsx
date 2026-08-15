import { useState, useMemo, useEffect } from "react";
import { Brain, ArrowRight, CheckCircle2, Loader2, Clock, Send, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useCreateStudySession, useFinishStudySession, useRecordRecallAttempt, useInProgressStudySessions } from "../../hooks";
import { useQuestions } from "@/features/questions/hooks";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: allQuestions, isLoading: isLoadingQuestions } = useQuestions();
  const { data: inProgressSessions } = useInProgressStudySessions();
  const createSession = useCreateStudySession();
  
  // finishSession hook needs the ID and started_at from the session
  const finishSessionMutation = useFinishStudySession(session?.id ?? "", session?.started_at ?? "");
  const recordAttempt = useRecordRecallAttempt();

  // Seleção dos conceitos reais (Regra 2)
  // 1 conceito por ciclo (Regra 4) e apenas com pergunta recuperável (Regra 23)
  const reviewQueue = useMemo(() => {
    if (!allQuestions || !concepts) return [];
    
    // Garantir unicidade por concept_id
    const uniqueConceptIds = new Set();
    const filteredConcepts = concepts.filter(c => {
      if (uniqueConceptIds.has(c.concept_id)) return false;
      uniqueConceptIds.add(c.concept_id);
      return true;
    });

    return filteredConcepts.map(c => {
      const questions = allQuestions.filter(q => (q as any).concept_id === c.concept_id && !q.is_archived);
      
      // Regra 23: Se não tiver pergunta, marcamos como "not ready"
      if (questions.length === 0) {
        return {
          concept: c.concept,
          conceptId: c.concept_id,
          question: null,
          memoryState: c,
          isReady: false
        };
      }
      
      // Regra 8: Priorizar discursiva
      const bestQuestion = questions.find(q => q.type === 'discursiva') || questions[0]; 
      
      return {
        concept: c.concept,
        conceptId: c.concept_id,
        question: bestQuestion,
        memoryState: c,
        isReady: true
      };
    });
  }, [concepts, allQuestions]);

  const currentItem = reviewQueue[currentIndex];

  // Regra 5 e 16: Criar ou Retomar sessão
  useEffect(() => {
    if (!user || session || createSession.isPending || reviewQueue.length === 0) return;

    const initSession = async () => {
      // Tentar encontrar sessão em andamento do tipo recuperacao
      const active = inProgressSessions?.find(s => s.method === "recuperacao");
      
      if (active) {
        setSession(active);
        // Regra 16: Tentar retomar o progresso (se disponível nos detalhes)
        const details = active.details as unknown as RecuperacaoDetails;
        if (details?.questionAttempts?.length > 0) {
          setAttempts(details.questionAttempts);
          // O índice deve ser o próximo após os concluídos
          const lastQuestionId = details.questionAttempts[details.questionAttempts.length - 1].questionId;
          const nextIdx = reviewQueue.findIndex(item => item.question?.id === lastQuestionId) + 1;
          if (nextIdx < reviewQueue.length) {
            setCurrentIndex(Math.max(0, nextIdx));
          }
        }
        setStartTime(Date.now());
      } else {
        try {
          const newSession = await createSession.mutateAsync({
            method: "recuperacao",
            lessonId: null,
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
      }
    };

    initSession();
  }, [user, session, inProgressSessions, reviewQueue]);

  const handleReveal = () => {
    if (!response.trim() && currentItem?.question?.type === 'discursiva') {
      toast.error("Escreva algo primeiro.");
      return;
    }
    setIsRevealed(true);
  };

  const handleAssess = async (confidence: number) => {
    if (!session || !currentItem || isSubmitting) return;
    setIsSubmitting(true);
    
    const durationMs = Date.now() - startTime;
    
    // Mapeamento FSRS Core (Regra 10 e 13)
    let result: RecallResult = "self_reported_correct";
    if (confidence === 1) result = "self_reported_incorrect";
    else if (confidence === 2) result = "self_reported_partial";

    try {
      // Regra 11 e 12: Registrar evidência e FSRS (via hook que chama Memory Engine)
      let evidenceId = "";
      if (currentItem.isReady && currentItem.question) {
        evidenceId = await recordAttempt.mutateAsync({
          sessionId: session.id,
          questionId: currentItem.question.id,
          response: response.trim(),
          result,
          resultSource: "self_assessment",
          confidence,
          responseTimeMs: durationMs,
          publishedVersion: (currentItem.question as any).published_version || null
        });
      }

      const newAttempt = {
        questionId: currentItem.question?.id || "no-question",
        evidenceId,
        response: response.trim(),
        result,
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
        setIsSubmitting(false);
      } else {
        // Regra 18: Finalizar sessão
        await finishSessionMutation.mutateAsync({
          questionAttempts: updatedAttempts,
          completedAt: new Date().toISOString()
        } as any);
        setIsFinished(true);
      }
    } catch (err) {
      toast.error("Erro ao salvar revisão");
      setIsSubmitting(false);
    }
  };

  if (isLoadingQuestions || (reviewQueue.length > 0 && !session)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Iniciando sessão de revisão...</p>
      </div>
    );
  }

  // Regra 18 e 19: Conclusão
  if (isFinished) {
    const recovered = attempts.filter(a => a.result === "self_reported_correct").length;
    const partial = attempts.filter(a => a.result === "self_reported_partial").length;
    const notLearned = attempts.filter(a => a.result === "self_reported_incorrect").length;
    const avgConfidence = attempts.length > 0 
      ? (attempts.reduce((sum, a) => sum + a.confidence, 0) / attempts.length).toFixed(1)
      : "0";
    
    return (
      <div className="max-w-2xl mx-auto text-center space-y-12 py-10 animate-in fade-in duration-700">
        <div className="space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground uppercase">Revisão Concluída</h2>
            <p className="text-muted-foreground font-medium">Dados factuais do seu desempenho hoje.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface/30 border border-border/10 rounded-[2rem] p-6 text-left space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/60">Recuperados</span>
            <p className="text-3xl font-black text-foreground">{recovered}</p>
          </div>
          <div className="bg-surface/30 border border-border/10 rounded-[2rem] p-6 text-left space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-orange-500/60">Parciais</span>
            <p className="text-3xl font-black text-foreground">{partial}</p>
          </div>
          <div className="bg-surface/30 border border-border/10 rounded-[2rem] p-6 text-left space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-red-500/60">Não lembrados</span>
            <p className="text-3xl font-black text-foreground">{notLearned}</p>
          </div>
          <div className="bg-surface/30 border border-border/10 rounded-[2rem] p-6 text-left space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-primary/60">Confiança Média</span>
            <p className="text-3xl font-black text-foreground">{avgConfidence}</p>
          </div>
        </div>

        <div className="pt-8">
          <Button onClick={onDone} className="h-14 px-10 rounded-full bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-primary/10">
            Concluir <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-500">
      {/* Regra 6 e 25: Tela de Foco */}
      <div className="flex items-center justify-between mb-16 border-b border-border/10 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left space-y-0.5">
            <h1 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Revisão</h1>
            <h2 className="text-sm font-black text-foreground uppercase tracking-tight">{currentItem?.concept?.title || 'Conceito'}</h2>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/30">Progresso</p>
          <p className="text-base font-black tabular-nums text-primary">{currentIndex + 1} / {reviewQueue.length}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-12">
        {currentItem?.isReady ? (
          <div className="space-y-10">
            <div className="space-y-4">
               <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10">
                 <span className="text-[8px] font-bold uppercase tracking-widest text-primary">Pergunta</span>
               </div>
               <h3 className="text-3xl font-black tracking-tighter text-foreground leading-tight">
                 {currentItem?.question?.statement}
               </h3>
            </div>

            {!isRevealed ? (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  autoFocus
                  placeholder="Recupere a resposta em sua mente e escreva aqui..."
                  className="min-h-[200px] rounded-[2rem] bg-surface/20 border-border/40 focus:border-primary/40 focus:ring-primary/10 text-lg p-8 resize-none transition-all placeholder:text-muted-foreground/20 font-medium"
                />
                <Button 
                  onClick={handleReveal}
                  className="w-full h-16 rounded-full bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-xs transition-all group"
                >
                  RESPONDER <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            ) : (
              <div className="space-y-12 animate-in fade-in duration-700">
                <div className="space-y-8">
                  <div className="space-y-3">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/60">Resposta Esperada</span>
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] p-8 text-foreground/80 font-medium leading-relaxed text-lg">
                      {currentItem?.question?.expected_answer || "Reforce este conceito em sua memória."}
                    </div>
                  </div>
                  
                  {response && (
                    <div className="space-y-3 opacity-60">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-primary/60">Sua Resposta</span>
                      <div className="bg-surface/40 border border-border/20 rounded-[2rem] p-8 text-foreground/70 font-medium">
                        {response}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-8 pt-8 border-t border-border/10">
                  <div className="text-center space-y-1">
                    <h4 className="text-xl font-black uppercase tracking-tight">Como foi sua lembrança?</h4>
                    <p className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-widest">Avalie a qualidade da sua recuperação</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { level: 1, label: "Não sabia", color: "hover:bg-red-500/10 hover:border-red-500/20" },
                      { level: 2, label: "Dificuldade", color: "hover:bg-orange-500/10 hover:border-orange-500/20" },
                      { level: 3, label: "Lembrei", color: "hover:bg-blue-500/10 hover:border-blue-500/20" },
                      { level: 4, label: "Facilidade", color: "hover:bg-emerald-500/10 hover:border-emerald-500/20" }
                    ].map((btn) => (
                      <Button
                        key={btn.level}
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => handleAssess(btn.level)}
                        className={cn(
                          "h-20 flex-col rounded-[1.5rem] border-border/40 font-bold uppercase tracking-tighter text-[10px] transition-all gap-1.5",
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
        ) : (
          <div className="py-20 text-center space-y-8 animate-in fade-in duration-700">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black tracking-tight text-foreground uppercase">Esta revisão ainda não está pronta</h2>
              <p className="text-muted-foreground font-medium max-w-sm mx-auto">
                Este conceito precisa de uma pergunta cadastrada para ser recuperado.
              </p>
            </div>
            <Button onClick={() => setCurrentIndex(prev => prev + 1)} variant="outline" className="h-12 px-8 rounded-full border-border/40 font-bold uppercase tracking-widest text-[10px]">
              Pular conceito <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}