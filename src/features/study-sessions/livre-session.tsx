import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, BookOpen, Clock, ChevronRight } from "lucide-react";

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
import { cn } from "@/lib/utils";
import { useLessonsByCourse, useLesson } from "@/features/studies/hooks/use-lessons";
import { useCourse } from "@/features/studies/hooks/use-courses";
import { useCourseModule } from "@/features/studies/hooks/use-course-modules";

interface LivreSessionProps {
  resumingSession: StudySessionRow | null;
  onDone: () => void;
  plannedId?: string;
  method?: StudyMethod;
  initialLessonId?: string;
  courseId?: string;
}

/** Fallback estável para useElapsedSeconds antes de a sessão existir — nunca exibido (o timer só aparece depois do INSERT). */
const NO_SESSION_ISO = new Date(0).toISOString();

export function LivreSession({ resumingSession, onDone, plannedId, method = "livre", initialLessonId, courseId: initialCourseId }: LivreSessionProps) {
  const [session, setSession] = useState<StudySessionRow | null>(resumingSession);
  const [lessonId, setLessonId] = useState<string | null>(resumingSession?.lesson_id ?? initialLessonId ?? null);
  const [nota, setNota] = useState("");
  const [optimisticStart, setOptimisticStart] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [showLessonSwitcher, setShowLessonSwitcher] = useState(false);
  
  const createSession = useCreateStudySession();
  const finishSession = useFinishStudySession(session?.id ?? "", session?.started_at ?? "", plannedId);
  
  // Data fetching para contexto
  const effectiveLessonId = lessonId || session?.lesson_id;
  const { data: lessonData } = useLesson(effectiveLessonId || undefined);
  
  const effectiveCourseId = initialCourseId || lessonData?.course_id || (session?.details as any)?.courseId;
  const { data: courseData } = useCourse(effectiveCourseId || undefined);
  const { data: courseLessons, isLoading: isLoadingLessons } = useLessonsByCourse(effectiveCourseId || undefined);
  const { data: moduleData } = useCourseModule(lessonData?.module_id || undefined);
  
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

  useUnsavedTextWarning(!!session && nota.trim().length > 0 && !isFinished);

  async function handleStart() {
    setOptimisticStart(new Date().toISOString());
    try {
      const created = await createSession.mutateAsync({
        method: method,
        lessonId: lessonId,
        isFreeSession: !lessonId,
        details: { ...initialDetailsForMethod(method), courseId: initialCourseId },
      });
      setSession(created);
    } catch (err) {
      setOptimisticStart(null);
      console.error(`[study-sessions] falha ao iniciar sessão ${method}`, err);
      toast.error("Não foi possível iniciar a sessão");
    }
  }

  useEffect(() => {
    // Caso 1: Já temos uma aula inicial (clicou em uma aula específica)
    if (initialLessonId && !session && !optimisticStart && !resumingSession) {
      handleStart();
      return;
    }

    // Caso 2: Temos apenas o curso (clicou em "Aprender Primeiro" no cockpit)
    // Vamos esperar as aulas carregarem e pegar a primeira disponível
    if (initialCourseId && !lessonId && !session && !optimisticStart && !resumingSession && !isLoadingLessons && courseLessons) {
      const firstActiveLesson = courseLessons.find(l => !l.is_archived);
      if (firstActiveLesson) {
        setLessonId(firstActiveLesson.id);
        // O próximo render vai disparar o handleStart através do useEffect de initialLessonId se mudarmos o prop,
        // ou podemos disparar manualmente aqui agora que temos o ID local.
      } else {
        // Se não tem aulas, inicia avulso (sem lessonId)
        handleStart();
      }
    }
  }, [initialLessonId, initialCourseId, isLoadingLessons, courseLessons, session, optimisticStart, resumingSession]);

  // Se o lessonId foi setado via efeito de curso, inicia a sessão
  useEffect(() => {
    if (lessonId && !session && !optimisticStart && !resumingSession && initialCourseId) {
      handleStart();
    }
  }, [lessonId]);

  async function handleFinish() {
    const details: LivreDetails = nota.trim() ? { nota: nota.trim() } : {};
    try {
      await finishSession.mutateAsync(details);
      toast.success("Sessão concluída");
      setIsFinished(true);
    } catch (err) {
      console.error("[study-sessions] falha ao concluir sessão livre", err);
      toast.error("Não foi possível concluir a sessão");
    }
  }

  // 12. FINAL DA PRIMEIRA SESSÃO (ou qualquer sessão de aprendizado concluída)
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
              {method === "aprender" ? "Primeiro contato concluído" : "Sessão concluída"}
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground/60 max-w-2xl mx-auto font-medium">
              Agora vamos descobrir quanto desse conteúdo você realmente reteve.
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
        <div className="rounded-[2.5rem] border border-border/40 bg-surface/20 p-8 md:p-12 space-y-10">
          <div className="space-y-4">
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 ml-1 text-center">
              {method === "aprender" ? "Escolha o que você vai aprender" : "O que você quer estudar?"}
            </h3>
            <div className="max-w-md mx-auto">
              <LessonPicker value={lessonId} onChange={setLessonId} />
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-6">
            <Button
              onClick={() => void handleStart()}
              disabled={createSession.isPending}
              size="lg"
              className="w-full max-w-md h-16 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-[0_0_40px_-10px_rgba(217,0,110,0.3)] transition-all hover:scale-[1.02] active:scale-95"
            >
              {createSession.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden />
                  Iniciando...
                </>
              ) : (
                method === "aprender" ? "Começar a aprender →" : "Iniciar Sessão Livre →"
              )}
            </Button>
            
            <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] max-w-xs text-center leading-relaxed">
              {method === "aprender" 
                ? "O Dominus irá registrar seu primeiro contato com este conteúdo." 
                : "Sessão livre para estudos sem método específico."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-700 pb-20">
      <div className="group relative overflow-hidden rounded-[2.5rem] border border-primary/20 bg-surface/30 p-8 md:p-12 transition-all">
        <div className="absolute -right-20 -top-20 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 space-y-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/10 pb-8">
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 mb-2">
                <span>DominusApp</span>
                <ChevronRight className="h-3 w-3" />
                <span className="truncate max-w-[150px]">{courseData?.name || "Estudos"}</span>
                {lessonData && (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-primary/60 truncate max-w-[150px]">{lessonData.title}</span>
                  </>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest">
                  {method === "aprender" ? (
                    <><BookOpen className="h-3 w-3" /> APRENDER</>
                  ) : "ESTUDO LIVRE"}
                </span>
                <span className="h-1 w-1 rounded-full bg-border/40" />
                <p className="text-[10px] font-black tabular-nums text-muted-foreground/40 uppercase tracking-widest">
                  <Clock className="h-3 w-3 inline mr-1.5" /> {formatSeconds(elapsed)}
                </p>
                {effectiveCourseId && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowLessonSwitcher(!showLessonSwitcher)}
                    className="h-6 px-3 rounded-full bg-surface/40 hover:bg-surface/60 text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest transition-all"
                  >
                    Trocar aula
                  </Button>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">O QUE ESTOU ESTUDANDO</p>
                <h2 className="text-2xl font-black tracking-tighter text-foreground/90 uppercase truncate">
                  {courseData?.name || "Sessão Independente"}
                </h2>
              </div>

              {lessonData && (
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">ONDE ESTOU</p>
                  <p className="text-sm font-bold text-primary/80">
                    {moduleData ? `${moduleData.name} · ` : ""}{lessonData.title}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">Ação recomendada</span>
                  <span className="text-xs font-black text-primary">Compreensão</span>
                </div>
                <div className="w-32 h-1 bg-surface/40 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[30%] transition-all duration-1000" />
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={onDone} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/20 hover:text-red-500 hover:bg-red-500/5 transition-all">
                Sair da sessão
              </Button>
            </div>
          </div>

          {showLessonSwitcher && (
            <div className="p-6 rounded-3xl border border-primary/20 bg-surface/40 animate-in slide-in-from-top-2 duration-300">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-4">Mudar foco para outra aula</h3>
               <LessonPicker 
                value={effectiveLessonId || null} 
                onChange={(newId) => {
                  setLessonId(newId);
                  setShowLessonSwitcher(false);
                  toast.success("Foco alterado");
                  // Nota: isso não encerra a sessão atual no banco, apenas muda o lessonId para persistências futuras ou a UI.
                  // Em uma implementação mais robusta, poderíamos atualizar a sessão no banco aqui.
                }} 
               />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 text-left">
            <div className="lg:col-span-8 space-y-6">
              <div className="space-y-4">
                <Label htmlFor="livre-nota" className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 ml-1">
                  {method === "aprender" ? "Compreensão do Material" : "Notas da Sessão"}
                </Label>
                <Textarea
                  id="livre-nota"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder={method === "aprender" ? "O que você está descobrindo agora? Use este espaço para anotar pontos chave..." : "O que você está estudando agora?"}
                  className="min-h-[400px] rounded-3xl border-border/20 bg-surface/40 focus:bg-surface/60 transition-all text-lg font-medium resize-none p-8 shadow-inner"
                  maxLength={20000}
                />
              </div>
            </div>
            
            <div className="lg:col-span-4 space-y-10">
              <div className="rounded-3xl border border-border/20 bg-surface/20 p-8 space-y-6">
                <div className="space-y-2 text-left">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Contexto</h4>
                  <p className="text-sm font-bold text-foreground/70 leading-relaxed">
                    Esta é sua fase de <strong>primeiro contato</strong>. O objetivo é a compreensão profunda, não a memorização imediata.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Dicas Dominus</h4>
                  <ul className="space-y-3">
                    {['Conecte com o que já sabe', 'Identifique termos novos', 'Não se preocupe em decorar'].map((tip, i) => (
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
                    "Concluir Estudo"
                  )}
                </Button>
                <p className="text-[9px] font-black uppercase tracking-widest text-center mt-6 text-muted-foreground/20">
                  Salve seu progresso para atualizar seu domínio
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
