/**
 * ESTUDAR — ETAPA 1 FINALIZADA (CONGELADA)
 * 
 * Este arquivo define o Cockpit de Estudos do DominusApp.
 * A lógica de recomendação baseia-se no estado do aprendizado:
 * - NOVO -> Aprender primeiro
 * - EM ANDAMENTO -> Recuperação Ativa
 * - CONCLUÍDO -> Manutenção (Flashcards)
 */
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
    
    const method = typeof search.method === "string" && ["pomodoro", "feynman", "blurting", "cornell", "recordacao_ativa", "livre", "aprender"].includes(search.method)
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
        ) : activeMethod === "aprender" || activeMethod === "livre" ? (
          <LivreSession resumingSession={resumingSession} onDone={backToHub} plannedId={plannedId} method={activeMethod} />
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
    <div className="max-w-6xl mx-auto space-y-16 pb-20">
      <header className="space-y-3">
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground">Estudar</h1>
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
        ) : (priority === "recommendation" || priority === "start") && (data.planned || data.course) ? (
          <div className="group relative overflow-hidden rounded-[2rem] border border-border/40 bg-surface/20 p-8 md:p-10 transition-all hover:border-primary/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest">
                    <Zap className="h-3 w-3" /> SEU PRÓXIMO PASSO
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                    {priority === "recommendation" ? "Recomendação Dominus" : (data.course?.status === 'not_started' ? 'Aprender conteúdo' : 'Recuperação ativa')}
                  </span>
                </div>
                <h2 className="text-3xl font-black tracking-tighter leading-tight max-w-xl">
                  {data.title || data.course?.name}
                </h2>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-muted-foreground/60 font-medium text-xs">
                    <BookOpen className="h-3 w-3" />
                    <span>
                      {priority === "recommendation" 
                        ? (data.planned?.status === 'not_started' ? 'Ainda não iniciado' : 'Continuar planejamento')
                        : (data.course?.status === 'not_started' ? 'Ainda não iniciado' : `${(data.course as any).progress?.percent || 0}% concluído`)}
                    </span>
                  </div>
                </div>
              </div>
              {/* No button here - the main CTA is in the Recommendation card below */}
            </div>
          </div>
        ) : null}
      </section>

      {/* 2. COMO ESTUDAR (CONTEXTUAL) */}
      {selectedContent && (
        <section ref={methodsHubRef} id="metodos-selecao" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Dominus Recomenda</h3>
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
      {(priority === "recommendation" || priority === "resume" || priority === "start") && data.courses && data.courses.filter((c: any) => c.status === "in_progress" && c.id !== selectedContent?.id).length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Continue de onde parou</h3>
            <span className="h-px flex-1 mx-6 bg-border/20" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.courses.filter((c: any) => c.status === "in_progress" && c.id !== selectedContent?.id).slice(0, 3).map((course: any) => (
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
      {allCourses && allCourses.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Meus Estudos</h3>
            <span className="h-px flex-1 mx-6 bg-border/20" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allCourses.map((course: any) => (
              <button
                key={course.id}
                onClick={() => handleContentSelect(course)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-border/20 bg-surface/10 p-4 text-left transition-all hover:border-primary/10 hover:bg-surface/20",
                  selectedContent?.id === course.id && "border-primary/30 bg-surface/30"
                )}
              >
                <div className="space-y-2">
                  <h4 className="text-xs font-bold tracking-tight text-foreground/70 group-hover:text-foreground transition-colors truncate">
                    {course.name}
                  </h4>
                  <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground/30">
                    <span>{course.status === 'not_started' ? 'Não iniciado' : `${course.progress?.percent || 0}%`}</span>
                    {selectedContent?.id === course.id && <Zap className="h-2 w-2 text-primary fill-primary" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

          )}

      </section>

      <AddContentDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
      />
    </div>
  );
}
