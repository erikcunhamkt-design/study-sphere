import { createFileRoute } from "@tanstack/react-router";
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

import { PageHeader } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useStudyState } from "@/features/study-sessions/use-study-state";
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
  validateSearch: (search: Record<string, unknown>): { plannedId?: string; method?: StudyMethod; deckId?: string; mode?: "review" | "training" } => {
    const plannedId = typeof search.plannedId === "string" && /^[0-9a-fA-F-]{36}$/.test(search.plannedId) 
      ? search.plannedId 
      : undefined;
    
    const deckId = typeof search.deckId === "string" && /^[0-9a-fA-F-]{36}$/.test(search.deckId) 
      ? search.deckId 
      : undefined;

    const mode = (search.mode === "review" || search.mode === "training")
      ? (search.mode as "review" | "training")
      : undefined;
    
    const method = typeof search.method === "string" && ["pomodoro", "feynman", "blurting", "cornell", "recordacao_ativa", "livre"].includes(search.method)
      ? (search.method as StudyMethod)
      : undefined;

    return { plannedId, method, deckId, mode };
  },
  component: EstudarPage,
});

function EstudarPage() {
  const { plannedId, method: initialMethod, deckId, mode } = Route.useSearch();
  const [activeMethod, setActiveMethod] = useState<StudyMethod | null>(initialMethod ?? null);
  const [resumingSession, setResumingSession] = useState<StudySessionRow | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<{
    id: string;
    name: string;
    status: string;
    type: 'course' | 'lesson';
  } | null>(null);
  const methodsHubRef = useRef<HTMLDivElement>(null);

  const { priority, data, isLoading, allCourses } = useStudyState();

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
    const label = STUDY_METHOD_LABELS[activeMethod];
    return (
      <div className="space-y-6">
        <PageHeader title={label} />
        {activeMethod === "pomodoro" ? (
          <PomodoroSession resumingSession={resumingSession} onDone={backToHub} plannedId={plannedId} />
        ) : activeMethod === "feynman" ? (
          <FeynmanSession resumingSession={resumingSession} onDone={backToHub} plannedId={plannedId} />
        ) : activeMethod === "blurting" ? (
          <BlurtingSession resumingSession={resumingSession} onDone={backToHub} plannedId={plannedId} />
        ) : activeMethod === "cornell" ? (
          <CornellSession resumingSession={resumingSession} onDone={backToHub} plannedId={plannedId} />
        ) : activeMethod === "livre" ? (
          <LivreSession resumingSession={resumingSession} onDone={backToHub} plannedId={plannedId} />
        ) : (
          <RecordacaoAtivaHub onBack={backToHub} deckId={deckId} mode={mode} />
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground animate-pulse">Organizando cockpit...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20">
      <header className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground">Estudar</h1>
        <p className="text-lg md:text-xl text-muted-foreground/40 font-medium tracking-tight">
          Escolha onde continuar ou deixe o Dominus indicar seu próximo passo.
        </p>
      </header>

      {/* 1. PRÓXIMO PASSO (HERO) */}
      <section>
        {priority === "onboarding" ? (
          <div className="group relative overflow-hidden rounded-[2rem] border border-border/40 bg-surface/20 p-8 md:p-12 text-center transition-all hover:border-primary/20">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
             <div className="relative z-10 space-y-6">
               <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                 <Zap className="h-8 w-8 fill-primary/20" />
               </div>
               <div className="space-y-2">
                 <h2 className="text-3xl font-black tracking-tighter">Comece seu primeiro estudo</h2>
                 <p className="text-muted-foreground/60 max-w-md mx-auto font-medium">
                   Adicione ou escolha um conteúdo para começar a construir seu mapa de conhecimento e dominar seus objetivos.
                 </p>
               </div>
               <Button 
                onClick={() => setIsAddDialogOpen(true)}
                size="lg" 
                className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-bold"
               >
                 Adicionar conteúdo <Plus className="ml-2 h-4 w-4" />
               </Button>
             </div>
          </div>
        ) : priority === "resume" && data.session ? (
          <div className="group relative overflow-hidden rounded-[2rem] border border-primary/20 bg-surface/30 p-8 md:p-10 transition-all hover:bg-surface/40">
            <div className="absolute -right-20 -top-20 w-[300px] h-[300px] bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest">
                    <Clock className="h-3 w-3" /> RETOMAR
                  </span>
                  {data.context && <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{data.context}</span>}
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight max-w-xl">
                  {data.title}
                </h2>
                <div className="flex items-center gap-6">
                   <div className="space-y-1">
                     <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">MÉTODO</p>
                     <p className="text-sm font-bold text-foreground/80">{STUDY_METHOD_LABELS[(data.session as StudySessionRow).method]}</p>
                   </div>
                   <div className="h-8 w-px bg-border/20" />
                   <div className="space-y-1">
                     <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">DURAÇÃO ATUAL</p>
                     <p className="text-sm font-bold text-foreground/80">{Math.floor(((data.session as StudySessionRow).duration_seconds || 0) / 60)} min</p>
                   </div>
                </div>
              </div>
              <Button 
                onClick={() => handleResume(data.session as StudySessionRow)}
                size="lg" 
                className="h-16 px-10 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-[0_0_40px_-10px_rgba(217,0,110,0.3)] group-hover:scale-105 transition-transform"
              >
                Continuar <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </div>
          </div>
        ) : priority === "recommendation" ? (
          <div className="group relative overflow-hidden rounded-[2rem] border border-border/40 bg-surface/20 p-8 md:p-10 transition-all hover:border-primary/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest">
                    <Brain className="h-3 w-3" /> SUA PRÓXIMA AÇÃO
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Recomendação Dominus</span>
                </div>
                <h2 className="text-3xl font-black tracking-tighter leading-tight max-w-xl">
                  {data.title}
                </h2>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-muted-foreground/60 font-medium">
                    <Clock className="h-4 w-4" />
                    <span>~{data.estimatedMinutes} min sugeridos</span>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => {
                  if (data.planned?.course_id || data.planned?.id) {
                    handleContentSelect({
                      id: data.planned.course_id || data.planned.id,
                      name: data.planned.title,
                      status: 'not_started'
                    });
                  } else {
                    setActiveMethod("livre");
                  }
                }}
                size="lg" 
                className="h-16 px-10 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg group-hover:scale-105 transition-transform"
              >
                Começar →
              </Button>
            </div>
          </div>
        ) : (priority === "resume" || priority === "start") && data.course ? (
          <div className="group relative overflow-hidden rounded-[2rem] border border-border/40 bg-surface/20 p-8 md:p-10 transition-all hover:border-primary/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest">
                    <Zap className="h-3 w-3" /> SEU PRÓXIMO PASSO
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                    {data.course.status === 'not_started' ? 'Começar Estudo' : 'Continuar Aprendizado'}
                  </span>
                </div>
                <h2 className="text-3xl font-black tracking-tighter leading-tight max-w-xl">
                  {data.course.status === 'not_started' ? `Começar ${data.course.name}` : `Continuar ${data.course.name}`}
                </h2>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-muted-foreground/60 font-medium">
                    <BookOpen className="h-4 w-4" />
                    <span>{data.course.status === 'not_started' ? 'Ainda não iniciado' : `${(data.course as any).progress?.percent || 0}% concluído`}</span>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => handleContentSelect(data.course)}
                size="lg" 
                className="h-16 px-10 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg group-hover:scale-105 transition-transform shadow-[0_0_40px_-10px_rgba(217,0,110,0.3)]"
              >
                {data.course.status === 'not_started' ? 'Começar estudo →' : 'Continuar estudo →'}
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {/* 2. COMO ESTUDAR (CONTEXTUAL) */}
      {selectedContent && (
        <section ref={methodsHubRef} id="metodos-selecao" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Como você quer estudar?</h3>
            <div className="flex items-center gap-3">
               <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(217,0,110,0.5)]" />
               <p className="text-xl font-black tracking-tight">{selectedContent.name}</p>
            </div>
          </div>
          
          <StudyMethodsHub onSelectMethod={setActiveMethod} selectedContent={selectedContent} />

          <div className="flex justify-center pt-8">
            <Button variant="ghost" onClick={() => setSelectedContent(null)} className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 hover:text-foreground">
              Escolher outro conteúdo
            </Button>
          </div>
        </section>
      )}

      {/* 3. CONTINUE (CURSOS EM ANDAMENTO) */}
      {(priority === "recommendation" || priority === "resume" || priority === "start") && data.courses && data.courses.length > 0 && (
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

      {/* 4. MEUS ESTUDOS (TODOS OS CURSOS) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Meus Estudos</h3>
          <span className="h-px flex-1 mx-6 bg-border/20" />
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {allCourses.filter(c => !c.is_archived).length > 0 ? (
            allCourses.filter(c => !c.is_archived).map((course) => (
              <div 
                key={course.id}
                onClick={() => handleContentSelect(course)}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-border/40 bg-surface/10 hover:bg-surface/20 transition-all group text-left cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-surface/40 flex items-center justify-center text-muted-foreground/40 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-bold tracking-tight text-foreground">{course.name}</h4>
                    <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-wider">
                      {COURSE_STATUS_LABELS[course.status as keyof typeof COURSE_STATUS_LABELS]}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-8 mt-4 sm:mt-0">
                  <div className="hidden md:block w-32 space-y-1.5">
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-tighter text-muted-foreground/20">
                      <span>Domínio</span>
                      <span>--</span>
                    </div>
                    <div className="h-1 w-full bg-surface/40 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500/20 w-0" />
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="sm" className="h-9 px-4 rounded-full text-muted-foreground/40 group-hover:text-primary font-black uppercase text-[10px] tracking-widest transition-colors">
                    {course.status === 'not_started' ? 'Começar →' : 'Continuar →'}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center rounded-[2rem] border border-dashed border-border/40 bg-surface/5 space-y-4">
              <div className="mx-auto w-12 h-12 rounded-xl bg-surface/10 flex items-center justify-center text-muted-foreground/20">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-foreground">Adicione seu primeiro conteúdo</p>
                <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto">O Dominus precisa de algo para estudar com você.</p>
              </div>
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                variant="outline"
                className="rounded-full border-primary/20 text-primary hover:bg-primary/10"
              >
                Adicionar conteúdo <Plus className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </section>

      <AddContentDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
      />
    </div>
  );
}
