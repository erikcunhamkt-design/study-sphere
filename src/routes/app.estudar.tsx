/**
 * ESTUDAR — LIMPEZA FINAL APROVADA
 * 
 * Este arquivo define o Hub de Estudos do DominusApp.
 * A interface é state-driven e segue a hierarquia:
 * 1. Contexto (Próximo Passo)
 * 2. Recomendação Dominus (Ação Única)
 * 3. Catálogo (Meus Estudos)
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  ArrowRight, 
  Brain, 
  ChevronRight, 
  Clock, 
  Plus, 
  Zap,
  BookOpen
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useNextBestAction } from "@/features/next-action/hooks/use-next-best-action";
import { PageHeader } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDeleteStudySession } from "@/features/study-sessions/hooks";
import { STUDY_METHOD_LABELS } from "@/features/study-sessions/labels";
import type { StudyMethod, StudySessionRow } from "@/features/study-sessions/types";
import { PomodoroSession } from "@/features/study-sessions/pomodoro-session";
import { FeynmanSession } from "@/features/study-sessions/feynman-session";
import { BlurtingSession } from "@/features/study-sessions/blurting-session";
import { CornellSession } from "@/features/study-sessions/cornell-session";
import { LivreSession } from "@/features/study-sessions/livre-session";
import { RecordacaoAtivaHub } from "@/features/study-sessions/recordacao-ativa-hub";
import { AddContentDialog } from "@/routes/app.index";
import { StudyMethodsHub } from "@/features/study-sessions/components/study-methods-hub";
import { COURSE_STATUS_LABELS } from "@/features/studies/utils";

export const Route = createFileRoute("/app/estudar")({
  validateSearch: (search: Record<string, unknown>): { plannedId?: string; method?: StudyMethod; deckId?: string; courseId?: string; mode?: "review" | "training" } => {
    const plannedId = typeof search.plannedId === "string" && /^[0-9a-fA-F-]{36}$/.test(search.plannedId) 
      ? search.plannedId 
      : undefined;
    
    const deckId = typeof search.deckId === "string" && /^[0-9a-fA-F-]{36}$/.test(search.deckId) 
      ? search.deckId 
      : undefined;

    const mode = (search.mode === "review" || search.mode === "training")
      ? (search.mode as "review" | "training")
      : undefined;
    
    const method = typeof search.method === "string" && ["pomodoro", "feynman", "blurting", "cornell", "flashcards", "exame", "livre", "aprender"].includes(search.method)
      ? (search.method as StudyMethod)
      : undefined;

    const courseId = typeof search.courseId === "string" && /^[0-9a-fA-F-]{36}$/.test(search.courseId)
      ? search.courseId
      : undefined;

    return { plannedId, method, deckId, courseId, mode };
  },
  component: EstudarPage,
});

function EstudarPage() {
  const { plannedId, method: initialMethod, deckId, courseId, mode } = Route.useSearch();
  const [activeMethod, setActiveMethod] = useState<StudyMethod | null>(initialMethod ?? null);
  const [resumingSession, setResumingSession] = useState<StudySessionRow | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<{
    id: string;
    name: string;
    status: string;
    type: 'course' | 'lesson';
  } | null>(courseId ? { id: courseId, name: "", status: "not_started", type: 'course' } : null);
  const methodsHubRef = useRef<HTMLDivElement>(null);

  const { primary: action, isLoading, dashboard } = useNextBestAction() as any;
  const allCourses = dashboard?.courses || [];
  const priority = action.type;
  const data = action.metadata || {};

  // Se já começou com um planejado ou recomendação, vamos preencher o selectedContent
  useEffect(() => {
    if (priority === "recommendation" && data.planned && !selectedContent) {
      setSelectedContent({
        id: data.planned.course_id || data.planned.id,
        name: data.planned.title,
        status: 'not_started',
        type: 'course'
      });
    } else if ((priority === "resume" || priority === "start") && data.course && !selectedContent) {
      // Para cursos em andamento ou não iniciados que o Dominus sugere
      setSelectedContent({
        id: data.course.id,
        name: data.course.name,
        status: data.course.status,
        type: 'course'
      });
    }
  }, [priority, data.planned, data.course]);
  
  function backToHub() {
    setActiveMethod(null);
    setResumingSession(null);
  }

  function handleResume(session: StudySessionRow) {
    setResumingSession(session);
    setActiveMethod(session.method);
  }

  function handleContentSelect(content: any) {
    setSelectedContent({
      id: content.id,
      name: content.name || content.title,
      status: content.status || 'not_started',
      type: content.title ? 'lesson' : 'course'
    });
    
    // Scroll suave para o hub de métodos após selecionar conteúdo
    setTimeout(() => {
      methodsHubRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  // Renderização da Sessão Ativa
  if (activeMethod) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-10">
          {activeMethod === "pomodoro" ? (
            <PomodoroSession resumingSession={resumingSession} onDone={backToHub} plannedId={plannedId} />
          ) : activeMethod === "feynman" ? (
            <FeynmanSession resumingSession={resumingSession} onDone={backToHub} plannedId={plannedId} />
          ) : activeMethod === "blurting" ? (
            <BlurtingSession resumingSession={resumingSession} onDone={backToHub} plannedId={plannedId} />
          ) : activeMethod === "cornell" ? (
            <CornellSession resumingSession={resumingSession} onDone={backToHub} plannedId={plannedId} />
          ) : activeMethod === "aprender" || activeMethod === "livre" ? (
            <LivreSession 
              resumingSession={resumingSession} 
              onDone={backToHub} 
              plannedId={plannedId} 
              method={activeMethod}
              initialLessonId={selectedContent?.type === 'lesson' ? selectedContent.id : undefined}
              courseId={selectedContent?.type === 'course' ? selectedContent.id : undefined}
            />
          ) : (
            <RecordacaoAtivaHub onBack={backToHub} deckId={deckId} mode={mode} />
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground animate-pulse">Organizando seus estudos...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-20 px-4 md:px-0">
      <header className="space-y-3">
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground">Estudar</h1>
        <p className="text-lg md:text-xl text-muted-foreground/40 font-medium tracking-tight">
          Escolha onde continuar ou deixe o Dominus indicar seu próximo passo.
        </p>
      </header>

      {/* 1. PRÓXIMO PASSO (HERO) */}
      <section>
        {action.type === 'add_content' ? (
          <div className="group relative overflow-hidden rounded-[2rem] border border-border/40 bg-surface/20 p-8 md:p-12 text-center transition-all hover:border-primary/20">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
             <div className="relative z-10 space-y-6">
               <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                 <Zap className="h-8 w-8 fill-primary/20" />
               </div>
               <div className="space-y-2">
                 <h2 className="text-3xl font-black tracking-tighter">{action.title}</h2>
                 <p className="text-muted-foreground/60 max-w-md mx-auto font-medium">
                   {action.description}
                 </p>
               </div>
               <Button 
                onClick={() => setIsAddDialogOpen(true)}
                size="lg" 
                className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-bold"
               >
                 {action.cta} <Plus className="ml-2 h-4 w-4" />
               </Button>
             </div>
          </div>
        ) : action.type === 'resume' && action.metadata?.session ? (
          <div className="group relative overflow-hidden rounded-[2rem] border border-primary/20 bg-surface/30 p-8 md:p-10 transition-all hover:bg-surface/40">
            <div className="absolute -right-20 -top-20 w-[300px] h-[300px] bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest">
                    <Clock className="h-3 w-3" /> RETOMAR
                  </span>
                  {action.metadata.course?.name && <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{action.metadata.course.name}</span>}
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight max-w-xl">
                  {action.metadata.lesson?.title || action.metadata.session?.planned_title || "Sessão em andamento"}
                </h2>
                <div className="flex items-center gap-6">
                   <div className="space-y-1">
                     <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">MÉTODO</p>
                     <p className="text-sm font-bold text-foreground/80">{STUDY_METHOD_LABELS[action.metadata.session.method as keyof typeof STUDY_METHOD_LABELS] || action.metadata.session.method}</p>
                   </div>
                   <div className="h-8 w-px bg-border/20" />
                   <div className="space-y-1">
                     <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">DURAÇÃO ATUAL</p>
                     <p className="text-sm font-bold text-foreground/80">{Math.floor((action.metadata.session.duration_seconds || 0) / 60)} min</p>
                   </div>
                </div>
              </div>
              <Button 
                onClick={() => handleResume(action.metadata.session)}
                size="lg" 
                className="h-16 px-10 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-[0_0_40px_-10px_rgba(217,0,110,0.3)] group-hover:scale-105 transition-transform"
              >
                {action.cta} <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </div>
          </div>
        ) : action.type === 'review' || action.type === 'reinforce' || action.type === 'test_memory' ? (
          <div className="group relative overflow-hidden rounded-[2rem] border border-primary/20 bg-surface/30 p-8 md:p-10 transition-all hover:bg-surface/40">
            <div className="absolute -right-20 -top-20 w-[300px] h-[300px] bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest">
                    <Zap className="h-3 w-3" /> {action.title.toUpperCase()}
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight max-w-xl">
                  {action.description}
                </h2>
                <p className="text-sm font-medium text-muted-foreground/60">{action.reason}</p>
              </div>
              <Button 
                asChild
                size="lg" 
                className="h-16 px-10 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-[0_0_40px_-10px_rgba(217,0,110,0.3)] group-hover:scale-105 transition-transform"
              >
                <Link to={action.type === 'reinforce' ? "/app/desempenho" : (action.type === 'review' ? "/app/revisar" : "/app/estudar")}>
                  {action.cta} <ArrowRight className="ml-2 h-6 w-6" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (action.type === 'continue' || action.type === 'first_study') && action.metadata?.course ? (
          <div className="group relative overflow-hidden rounded-[2rem] border border-border/40 bg-surface/20 p-8 md:p-10 transition-all hover:border-primary/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest">
                    <Zap className="h-3 w-3" /> SEU PRÓXIMO PASSO
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                    {action.type === 'first_study' ? 'Aprender conteúdo' : 'Recuperação ativa'}
                  </span>
                </div>
                <h2 className="text-3xl font-black tracking-tighter leading-tight max-w-xl">
                  {action.metadata.course.name}
                </h2>
                <p className="text-sm font-medium text-muted-foreground/60">{action.reason}</p>
              </div>
              <Button 
                onClick={() => {
                  setSelectedContent({
                    id: action.metadata.course.id,
                    name: action.metadata.course.name,
                    status: action.metadata.course.status,
                    type: 'course'
                  });
                  setActiveMethod(action.metadata.course.status === 'not_started' ? 'aprender' : 'flashcards');
                }}
                size="lg" 
                className="h-16 px-10 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-[0_0_40px_-10px_rgba(217,0,110,0.3)] group-hover:scale-105 transition-transform"
              >
                {action.cta} <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {/* 2. COMO ESTUDAR (CONTEXTUAL) */}
      {selectedContent && (
        <section ref={methodsHubRef} id="metodos-selecao" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <StudyMethodsHub onSelectMethod={setActiveMethod} selectedContent={selectedContent} />

          {allCourses && allCourses.length > 1 && (
            <div className="flex justify-center pt-8 border-t border-border/10">
              <Button variant="ghost" onClick={() => setSelectedContent(null)} className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 hover:text-foreground">
                Escolher outro conteúdo
              </Button>
            </div>
          )}
        </section>
      )}

      {/* 3. CONTINUE (SESSÕES EM ANDAMENTO - APENAS SE HOUVER) */}
      {!selectedContent && priority !== "resume" && data.courses && data.courses.filter((c: any) => c.status === "in_progress").length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Continue de onde parou</h3>
            <span className="h-px flex-1 mx-6 bg-border/20" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.courses.filter((c: any) => c.status === "in_progress").slice(0, 3).map((course: any) => (
              <button 
                key={course.id}
                onClick={() => handleContentSelect(course)}
                className="group flex flex-col p-6 rounded-[1.5rem] border border-border/40 bg-surface/20 text-left transition-all hover:border-primary/20 hover:bg-surface/30"
              >
                <div className="flex-1 space-y-3">
                  <h4 className="font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">{course.name}</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-muted-foreground/40">
                      <span>{course.progress?.percent || 0}% concluído</span>
                    </div>
                    <Progress value={course.progress?.percent || 0} className="h-1 bg-surface/40" />
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-black uppercase tracking-widest">Estudar agora</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 4. MEUS ESTUDOS (CATÁLOGO COMPACTO) */}
      {allCourses && allCourses.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Meus Estudos</h3>
            <span className="h-px flex-1 mx-6 bg-border/20" />
          </div>
          
          <div className="space-y-3">
            {allCourses.map((course: any) => (
              <button
                key={course.id}
                onClick={() => handleContentSelect(course)}
                className={cn(
                  "group flex items-center justify-between w-full p-4 rounded-2xl border border-border/20 bg-surface/10 text-left transition-all hover:border-primary/20 hover:bg-surface/20",
                  selectedContent?.id === course.id && "border-primary/30 bg-surface/30"
                )}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 group-hover:text-primary transition-colors",
                    selectedContent?.id === course.id ? "bg-primary/10 text-primary" : "bg-surface/30"
                  )}>
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold tracking-tight text-foreground/80 group-hover:text-foreground transition-colors">
                      {course.name}
                    </h4>
                    <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">
                      <span>{course.status === 'not_started' ? 'Não iniciado' : `${course.progress?.percent || 0}% Concluído`}</span>
                      {course.last_activity_at && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-border/40" />
                          <span>Último estudo: {new Date(course.last_activity_at).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all",
                  selectedContent?.id === course.id 
                    ? "bg-primary/20 text-primary" 
                    : "opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-primary"
                )}>
                  {selectedContent?.id === course.id ? (
                    <>Selecionado <Zap className="h-3 w-3 fill-primary" /></>
                  ) : (
                    <>Estudar <ChevronRight className="h-3 w-3" /></>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}


      <AddContentDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
      />
    </div>
  );
}
