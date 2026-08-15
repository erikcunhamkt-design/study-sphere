import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { 
  Brain, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle, 
  ChevronRight, 
  Loader2, 
  Clock, 
  Send,
  AlertCircle,
  Undo2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useCreateStudySession, useFinishStudySession, useRecordRecallAttempt } from "../hooks";
import { useQuestions } from "@/features/questions/hooks";
import { useLesson } from "@/features/studies/hooks/use-lessons";
import { useCourse } from "@/features/studies/hooks/use-courses";
import { useLessonDocument } from "@/features/lesson-editor/hooks";
import { formatSeconds } from "../format";
import { cn } from "@/lib/utils";
import type { StudySessionRow, RecuperacaoDetails } from "../types";

interface RecuperacaoSessionProps {
  lessonId: string;
  courseId?: string;
  onDone: () => void;
  resumingSession?: StudySessionRow | null;
}

type ConfidenceLevel = "nenhum" | "dificil" | "lembrei" | "facil";

const CONFIDENCE_MAP: Record<ConfidenceLevel, number> = {
  nenhum: 1,
  dificil: 2,
  lembrei: 3,
  facil: 4,
};

const RESULT_MAP: Record<ConfidenceLevel, string> = {
  nenhum: "incorrect",
  dificil: "partial",
  lembrei: "correct",
  facil: "correct",
};


export function RecuperacaoSession({ lessonId, courseId, onDone, resumingSession }: RecuperacaoSessionProps) {
  const { user } = useAuth();
  const [session, setSession] = useState<StudySessionRow | null>(resumingSession ?? null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [isRevealed, setIsRevealed] = useState(false);
  const [attempts, setAttempts] = useState<RecuperacaoDetails["questionAttempts"]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());

  const { data: questions, isLoading: isLoadingQuestions } = useQuestions();
  const { data: lesson } = useLesson(lessonId);
  const { data: course } = useCourse(courseId || lesson?.course_id);
  const { data: lessonDoc } = useLessonDocument(lessonId);

  const createSession = useCreateStudySession();
  const finishSession = useFinishStudySession(session?.id ?? "", session?.started_at ?? "");

  // Filtrar questões reais da aula e material (Gate 1 - Etapa 4 e 22)
  const lessonQuestions = useMemo(() => {
    if (!questions) return [];
    return questions.filter(q => q.lesson_id === lessonId && !q.is_archived);
  }, [questions, lessonId]);

  // Se não houver questões, poderiamos derivar dos blocos (Fase 10 - Etapa 22)
  // Mas conforme instrução 21: Não inventar se não houver lógica baseada em conteúdo real.
  // Por enquanto usamos apenas a tabela 'questions'.

  const currentQuestion = lessonQuestions[currentIndex];

  // Iniciar sessão automaticamente
  useEffect(() => {
    if (!session && !createSession.isPending && lessonQuestions.length > 0) {
      const start = async () => {
        try {
          const newSession = await createSession.mutateAsync({
            method: "recuperacao",
            lessonId,
            isFreeSession: false,
            details: {
              questionAttempts: [],
              lessonId,
              courseId,
              publishedVersion: lessonDoc?.published_version
            },
            publishedVersion: lessonDoc?.published_version
          });
          setSession(newSession);
          setStartTime(Date.now());
        } catch (err) {
          console.error("Erro ao iniciar sessão de recuperação:", err);
          toast.error("Não foi possível iniciar a sessão de teste.");
        }
      };
      start();
    }
  }, [session, lessonQuestions.length, lessonDoc?.published_version]);

  const handleReveal = () => {
    if (!response.trim()) {
      toast.error("Escreva algo antes de revelar a resposta.");
      return;
    }
    setIsRevealed(true);
  };

  const handleAssess = async (confidence: ConfidenceLevel) => {
    const duration = (Date.now() - startTime) / 1000;
    
    const newAttempt = {
      questionId: currentQuestion.id,
      response: response.trim(),
      confidence,
      responseTimeSeconds: duration,
      attemptedAt: new Date().toISOString()
    };

    const updatedAttempts = [...attempts, newAttempt];
    setAttempts(updatedAttempts);

    if (currentIndex < lessonQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setResponse("");
      setIsRevealed(false);
      setStartTime(Date.now());
    } else {
      // Finalizar sessão
      try {
        const details: RecuperacaoDetails = {
          questionAttempts: updatedAttempts,
          lessonId,
          courseId,
          publishedVersion: lessonDoc?.published_version,
          completedAt: new Date().toISOString()
        };
        await finishSession.mutateAsync(details);
        setIsFinished(true);
      } catch (err) {
        console.error("Erro ao finalizar recuperação:", err);
        toast.error("Erro ao salvar progresso.");
      }
    }
  };

  if (isLoadingQuestions) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Preparando o cérebro...</p>
      </div>
    );
  }

  if (lessonQuestions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-8 animate-in fade-in duration-700">
        <div className="w-20 h-20 rounded-[2rem] bg-surface/40 border border-border/20 flex items-center justify-center mx-auto text-muted-foreground/20">
          <HelpCircle className="h-10 w-10" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-black tracking-tight text-foreground uppercase italic">Ainda não há perguntas</h2>
          <p className="text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed">
            Este conteúdo ainda não possui perguntas reais ou flashcards publicados para testar sua memória.
          </p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <Button onClick={onDone} variant="outline" className="h-14 px-8 rounded-full border-border/40 font-black uppercase tracking-widest text-[10px]">
            Voltar aos Estudos
          </Button>
          <p className="text-[9px] font-bold text-muted-foreground/20 uppercase tracking-widest">DICA: Adicione questões no editor da aula.</p>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const recoveredCount = attempts.filter(a => a.confidence === "lembrei" || a.confidence === "facil").length;
    
    return (
      <div className="max-w-2xl mx-auto text-center space-y-12 py-10 animate-in fade-in duration-700">
        <div className="space-y-6">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <div className="relative w-24 h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto animate-in zoom-in duration-1000">
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl font-black tracking-tight text-foreground uppercase italic">Recuperação Concluída</h2>
            <p className="text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
              Você testou sua memória sobre este conteúdo. A evidência gerada ajudará o Dominus a planejar sua próxima revisão.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-surface/30 border border-border/10 rounded-[2rem] p-6 text-left space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">Conceitos Testados</span>
            <p className="text-2xl font-black text-foreground">{lessonQuestions.length}</p>
          </div>
          <div className="bg-surface/30 border border-border/10 rounded-[2rem] p-6 text-left space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60">Recuperados</span>
            <p className="text-2xl font-black text-foreground">{recoveredCount}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 pt-6">
          <Button onClick={onDone} className="h-16 px-12 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-[0_0_40px_-10px_rgba(217,0,110,0.5)] transition-all">
            CONCLUIR <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-500">
      {/* Header Foco (Etapa 32) */}
      <div className="flex items-center justify-between mb-12 border-b border-border/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h1 className="text-xs font-black uppercase tracking-widest text-foreground/80">Testar Memória</h1>
            <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-tighter truncate max-w-[200px]">
              {course?.name} · {lesson?.title}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">Progresso</p>
            <p className="text-sm font-black tabular-nums text-foreground/60">{currentIndex + 1} / {lessonQuestions.length}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onDone} className="h-8 px-3 rounded-full text-muted-foreground/40 hover:text-foreground">
            Sair
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-10">
        {/* Área da Pergunta (Etapa 3) */}
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Pergunta</span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground/90 leading-tight">
              {currentQuestion.statement}
            </h2>
          </div>

          {!isRevealed ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 italic">Recupere sem consultar o material</span>
                </div>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Escreva sua resposta aqui..."
                  className="min-h-[200px] rounded-[2rem] bg-surface/20 border-border/40 focus:border-primary/40 focus:ring-primary/10 text-base p-6 resize-none transition-all placeholder:text-muted-foreground/20 font-medium"
                />
              </div>
              <Button 
                onClick={handleReveal}
                disabled={!response.trim()}
                className="w-full h-16 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-[0_0_30px_-5px_rgba(217,0,110,0.3)] transition-all"
              >
                RESPONDER E REVELAR <Send className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in duration-700">
              {/* Revelação (Etapa 7) */}
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60">Resposta Esperada</span>
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] p-6 text-foreground/80 font-medium leading-relaxed">
                    {currentQuestion.expected_answer || currentQuestion.options?.[currentQuestion.correct_option_index ?? 0] || "O autor não definiu uma resposta padrão, use sua autoavaliação."}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Sua Resposta</span>
                  <div className="bg-surface/40 border border-border/20 rounded-[2rem] p-6 text-foreground/70 font-medium italic">
                    "{response}"
                  </div>
                </div>
              </div>

              {/* Autoavaliação (Etapa 8 e 25) */}
              <div className="space-y-8 pt-4 border-t border-border/10">
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-black uppercase tracking-tight italic">Como foi a recuperação?</h3>
                  <p className="text-xs text-muted-foreground/40 font-medium italic">Seja honesto com sua memória para melhores resultados.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { level: "nenhum" as const, label: "Não sabia", color: "hover:bg-red-500/10 hover:border-red-500/20" },
                    { level: "dificil" as const, label: "Com dificuldade", color: "hover:bg-orange-500/10 hover:border-orange-500/20" },
                    { level: "lembrei" as const, label: "Lembrei", color: "hover:bg-blue-500/10 hover:border-blue-500/20" },
                    { level: "facil" as const, label: "Com facilidade", color: "hover:bg-emerald-500/10 hover:border-emerald-500/20" }
                  ].map((btn) => (
                    <Button
                      key={btn.level}
                      variant="outline"
                      onClick={() => handleAssess(btn.level)}
                      className={cn(
                        "h-20 flex-col rounded-3xl border-border/40 font-black uppercase tracking-tighter text-[9px] transition-all",
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
