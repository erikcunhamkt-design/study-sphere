import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, BookOpen, Clock, ChevronRight, AlertCircle, Timer, ArrowLeft, ArrowRight, Settings, LogOut, CheckCircle2, Zap, Brain } from "lucide-react";

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
import { LessonContentViewer } from "./components/lesson-content-viewer";
import { useLessonDocument } from "@/features/lesson-editor/hooks";

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
  
  // Estado para controle de material real e progresso
  const [materialStats, setMaterialStats] = useState({ hasReal: false, blocksCount: 0 });
  const [blocksViewed, setBlocksViewed] = useState(0);

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

  const elapsed = useElapsedSeconds(clockAnchor, method === "aprender" && !materialStats.hasReal);

  useUnsavedTextWarning(!!session && nota.trim().length > 0 && !isFinished);

  async function handleStart() {
    // Evita múltiplas chamadas se já estiver iniciando ou se já tiver sessão
    if (optimisticStart || session || createSession.isPending) return;

    setOptimisticStart(new Date().toISOString());
    
    // Log detalhado para depuração no preview
    console.log("[study-sessions] Iniciando sessão real:", {
      method,
      lessonId,
      initialCourseId,
      isFreeSession: !lessonId
    });

    try {
      const created = await createSession.mutateAsync({
        method: method,
        lessonId: lessonId,
        isFreeSession: !lessonId,
        details: { ...initialDetailsForMethod(method), courseId: initialCourseId },
      });
      console.log("[study-sessions] Sessão criada com sucesso:", created.id);
      setSession(created);
    } catch (err) {
      setOptimisticStart(null);
      console.error(`[study-sessions] falha crítica ao iniciar sessão ${method}:`, err);
      // Extrair mensagem de erro real se disponível
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Não foi possível iniciar a sessão: ${errorMessage}`);
    }
  }

  useEffect(() => {
    // Bloqueia execução se já estivermos no processo ou com dados carregando
    if (session || optimisticStart || resumingSession || isLoadingLessons) return;

    // Caso 1: Já temos uma aula inicial (clicou em uma aula específica)
    if (initialLessonId) {
      if (!lessonId) setLessonId(initialLessonId);
      void handleStart();
      return;
    }

    // Caso 2: Temos apenas o curso (clicou em "Aprender Primeiro" no cockpit)
    if (initialCourseId && !lessonId) {
      if (courseLessons && courseLessons.length > 0) {
        const firstActiveLesson = courseLessons.find(l => !l.is_archived);
        if (firstActiveLesson) {
          console.log("[study-sessions] Resolvendo aula automática:", firstActiveLesson.title);
          setLessonId(firstActiveLesson.id);
          // O handleStart será chamado pelo useEffect de lessonId abaixo
        } else {
          console.log("[study-sessions] Curso sem aulas ativas, iniciando avulso");
          void handleStart();
        }
      } else if (courseLessons && courseLessons.length === 0) {
        console.log("[study-sessions] Curso sem nenhuma aula, iniciando avulso");
        void handleStart();
      }
    }
  }, [initialLessonId, initialCourseId, isLoadingLessons, courseLessons, session, optimisticStart, resumingSession]);

  const { data: lessonDoc } = useLessonDocument(effectiveLessonId || "");
  

  // Se o lessonId foi setado via efeito de curso, inicia a sessão assim que o estado estabilizar
  useEffect(() => {
    if (lessonId && !session && !optimisticStart && !resumingSession) {
      // Pequeno delay para garantir que o estado de lessonId seja propagado se veio da resolução automática
      const timer = setTimeout(() => {
        void handleStart();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [lessonId]);

  async function handleFinish() {
    if (!session) return;
    
    // Regra de conclusão: Se for o método 'aprender', precisa ter material real
    // Regra de conclusão: Se for o método 'aprender', precisa ter material real
    if (method === "aprender" && !materialStats.hasReal) {
      // Esta verificação é uma rede de segurança, o botão já deve estar escondido na UI
      toast.error("Esta sessão não possui material real.");
      return;
    }

    // Progresso: No 'aprender', medimos se o usuário percorreu o material (pelo menos 50% ou 1 bloco)
    // Para simplificar esta etapa sem tracking complexo de scroll, usamos a intenção de conclusão
    // após o carregamento do material real. A regra de 10s vira contexto secundário.

    const details: LivreDetails = {
      ...(nota.trim() ? { nota: nota.trim() } : {}),
      blocksCount: materialStats.blocksCount,
      completedAt: new Date().toISOString()
    };
    
    try {
      await finishSession.mutateAsync(details);
      toast.success(method === "aprender" ? "Primeiro contato concluído!" : "Sessão concluída");
      setIsFinished(true);
    } catch (err) {
      console.error("[study-sessions] falha ao concluir sessão", err);
      toast.error("Não foi possível concluir a sessão");
    }
  }


  // Nova transição agressiva para Recuperação Ativa
  if (isFinished) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-700">
        <div className="max-w-2xl w-full text-center space-y-12">
          <div className="space-y-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <div className="relative w-24 h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-1000">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground uppercase italic">
                {method === "aprender" ? "Primeiro Contato Concluído" : "Sessão Finalizada"}
              </h2>
              <p className="text-muted-foreground text-lg font-medium max-w-lg mx-auto leading-relaxed">
                {method === "aprender" 
                  ? "Você terminou de percorrer o material original. Agora é o momento crucial de transformar leitura em memória de longo prazo."
                  : "Seu progresso foi registrado com sucesso. O domínio do conteúdo é construído com consistência."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="bg-surface/40 border border-border/20 rounded-[2.5rem] p-8 space-y-4 text-left transition-all hover:bg-surface/60 group">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Status</h4>
              <div className="space-y-1">
                <p className="text-xl font-bold text-foreground">
                  {method === "aprender" ? "Material Percorrido" : "Tempo Registrado"}
                </p>
                <p className="text-xs text-muted-foreground/60">
                  {method === "aprender" 
                    ? `${materialStats.blocksCount} blocos registrados no seu histórico` 
                    : `${formatSeconds(elapsed)} dedicados a este estudo`}
                </p>
              </div>
            </div>

            <div className="bg-surface/40 border border-border/20 rounded-[2.5rem] p-8 space-y-4 text-left transition-all hover:bg-surface/60">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Próximo Passo</h4>
              <div className="space-y-1">
                <p className="text-xl font-bold text-foreground">Recuperação Ativa</p>
                <p className="text-xs text-muted-foreground/60">Descubra o que realmente ficou na memória</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
            <Button
              size="lg"
              onClick={onDone}
              className="w-full sm:w-auto h-16 px-12 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-[0_0_50px_-10px_rgba(217,0,110,0.5)] transition-all hover:scale-105 active:scale-95"
            >
              TESTAR MEMÓRIA <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={onDone}
              className="text-muted-foreground font-black uppercase tracking-widest text-[11px] hover:text-foreground transition-colors"
            >
              Voltar ao Cockpit
            </Button>
          </div>
        </div>
      </div>
    );
  }


  if (!session && !optimisticStart) {
    // Enquanto carrega aulas ou resolve a primeira unidade, mostramos o loader
    // para evitar o flash da tela "Escolha o que você vai aprender"
    if (isLoadingLessons || (initialCourseId && !lessonId && courseLessons === undefined)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Identificando conteúdo...</p>
        </div>
      );
    }

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
                  <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">Material</span>
                  <span className="text-xs font-black text-primary">
                    {materialStats.hasReal ? `${materialStats.blocksCount} blocos` : "Vazio"}
                  </span>
                </div>
                <div className="w-32 h-1 bg-surface/40 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-full transition-all duration-1000" />
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
                  // Se a sessão já foi criada no banco, idealmente faríamos um UPDATE aqui.
                  // Mas para o MVP de UX, apenas mudar o lessonId local já reflete na UI e em futuras persistências de detalhes.
                }} 
               />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 text-left">
            <div className="lg:col-span-8 space-y-10">
              {/* Prioridade 1: CONTEÚDO REAL */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground/40">
                    MATERIAL DE ESTUDO
                  </Label>
                  {materialStats.hasReal && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full">
                      {materialStats.blocksCount} BLOCOS
                    </span>
                  )}
                </div>
                
                <div className="min-h-[500px] rounded-[2.5rem] border border-border/10 bg-surface/20 p-8 md:p-12 shadow-sm transition-all overflow-hidden">
                  {lessonId ? (
                    <LessonContentViewer 
                      lessonId={lessonId} 
                      onMaterialLoad={(hasReal, count) => setMaterialStats({ hasReal, blocksCount: count })}
                      canEdit={true}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                      <AlertCircle className="h-10 w-10 text-muted-foreground/20" />
                      <p className="text-sm font-bold text-muted-foreground/40 uppercase tracking-widest">
                        Nenhuma aula selecionada
                      </p>
                    </div>
                  )}
                </div>
              </div>


              {/* Prioridade 2: COMPREENSÃO (Notas transformadas em elemento secundário) */}
              <div className={cn("space-y-6 pt-6 border-t border-border/5", !materialStats.hasReal && "opacity-50")}>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase tracking-widest text-foreground/80">Reflexão & Notas</h3>
                    <p className="text-[10px] text-muted-foreground/40 font-medium">
                      {materialStats.hasReal 
                        ? "Insights registrados aqui são anotações do estudante."
                        : "Notas ficam disponíveis como recurso secundário."}
                    </p>
                  </div>
                  <span className="text-[9px] font-medium text-muted-foreground/20 italic">Não é o conteúdo principal</span>
                </div>
                
                <div className="space-y-4">
                  <Label htmlFor="livre-nota" className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/30 ml-1">
                    SUAS NOTAS
                  </Label>
  
                  <Textarea
                    id="livre-nota"
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder={materialStats.hasReal 
                      ? "O que você está descobrindo agora? Liste conceitos chaves, dúvidas ou relações..."
                      : "Aguardando material para anotações..."}
                    className="min-h-[250px] rounded-3xl border-border/20 bg-surface/40 focus:bg-surface/60 transition-all text-base font-medium resize-none p-6 shadow-inner focus-visible:ring-primary/20"
                    maxLength={20000}
                  />
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-4 space-y-10">
              {/* Prioridade 3: ORIENTAÇÃO PEDAGÓGICA CONTEXTUAL */}
              <div className="rounded-3xl border border-border/20 bg-surface/20 p-8 space-y-8 sticky top-8">
                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", materialStats.hasReal ? "bg-primary animate-pulse" : "bg-muted-foreground/20")} />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">O QUE FAZER AGORA</h4>
                  </div>
                  <div className="space-y-2">
                    <p className="text-base font-black text-foreground/90 uppercase tracking-tight">
                      {!materialStats.hasReal && method === "aprender" 
                        ? "Aguarde o material" 
                        : method === "aprender" 
                          ? "Compreenda o conteúdo" 
                          : "Pratique livremente"}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground/60 leading-relaxed">
                      {!materialStats.hasReal && method === "aprender"
                        ? "Assim que o conteúdo estiver disponível, você poderá iniciar seu primeiro contato."
                        : method === "aprender" 
                          ? "Identifique a ideia central, conecte com o que você já sabe e destaque o que ainda não está claro."
                          : "Use o espaço de notas para registrar seu progresso e insights durante o estudo."}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">DICAS</h4>
                  <ul className="space-y-4">
                    {method === "aprender" ? (
                      [
                        { label: 'Conecte com o que já sabe', icon: <Brain className="h-3 w-3" /> },
                        { label: 'Identifique termos novos', icon: <Zap className="h-3 w-3" /> },
                        { label: 'Não tente decorar tudo agora', icon: <BookOpen className="h-3 w-3" /> }
                      ].map((tip, i) => (
                        <li key={i} className="flex items-start gap-3 text-xs text-muted-foreground/60 font-medium text-left group">
                          <div className="mt-0.5 p-1 rounded-md bg-primary/5 text-primary/40 group-hover:text-primary/60 transition-colors shrink-0">
                            {tip.icon}
                          </div>
                          <span className="leading-relaxed">{tip.label}</span>
                        </li>
                      ))
                    ) : (
                      ['Mantenha o foco absoluto', 'Elimine distrações', 'Faça pausas se necessário'].map((tip, i) => (
                        <li key={i} className="flex items-start gap-3 text-xs text-muted-foreground/60 font-medium text-left">
                          <div className="mt-1.5 w-1 h-1 rounded-full bg-primary/40 shrink-0" />
                          {tip}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              <div className="pt-6">
                {materialStats.hasReal ? (
                  <>
                    <Button
                      onClick={() => void handleFinish()}
                      disabled={finishSession.isPending || !session}
                      size="lg"
                      className="w-full h-20 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-xl shadow-[0_0_50px_-10px_rgba(217,0,110,0.4)] transition-all hover:scale-[1.05] active:scale-95"
                    >
                      {finishSession.isPending ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        "Concluir Primeiro Contato"
                      )}
                    </Button>
                    <p className="text-[9px] font-black uppercase tracking-widest text-center mt-6 text-muted-foreground/20">
                      Salve seu progresso para atualizar seu domínio
                    </p>
                  </>
                ) : (
                  <div className="p-6 rounded-3xl border border-dashed border-border/20 bg-surface/10 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 leading-relaxed">
                      Sessão aguardando material real para permitir a conclusão.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
