import { createFileRoute } from "@tanstack/react-router";
import { 
  ArrowRight, 
  Brain, 
  Calendar, 
  ChevronRight, 
  Clock, 
  Flame, 
  Library, 
  Plus, 
  Zap,
  BookOpen
} from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
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
  
  const { priority, data, isLoading, allCourses } = useStudyState();

  function backToHub() {
    setActiveMethod(null);
    setResumingSession(null);
  }

  function handleResume(session: StudySessionRow) {
    setResumingSession(session);
    setActiveMethod(session.method);
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
        ) : priority === "resume" ? (
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
                    <Brain className="h-3 w-3" /> PRÓXIMO PASSO
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Planejado para hoje</span>
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
                onClick={() => setActiveMethod("livre")} // Fallback para início de sessão
                size="lg" 
                className="h-16 px-10 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg group-hover:scale-105 transition-transform"
              >
                Começar <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {/* 2. CONTINUE (CURSOS EM ANDAMENTO) */}
      {(priority === "continue" || priority === "recommendation" || priority === "resume") && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Continue Estudando</h3>
            <span className="h-px flex-1 mx-6 bg-border/20" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(priority === "continue" ? data.courses : allCourses.filter(c => c.status === "in_progress")).slice(0, 3).map((course: any) => (
              <button 
                key={course.id}
                className="group flex flex-col p-6 rounded-[1.5rem] border border-border/40 bg-surface/20 text-left transition-all hover:border-primary/20 hover:bg-surface/30"
              >
                <div className="flex-1 space-y-3">
                  <h4 className="font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">{course.name}</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-muted-foreground/40">
                      <span>{course.progress || 0}% concluído</span>
                    </div>
                    <Progress value={course.progress || 0} className="h-1 bg-surface/40" />
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-black uppercase tracking-widest">Continuar</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 3. MEUS ESTUDOS (TODOS OS CURSOS) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Meus Estudos</h3>
          <span className="h-px flex-1 mx-6 bg-border/20" />
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {allCourses.length > 0 ? (
            allCourses.filter(c => !c.is_archived).map((course) => (
              <div 
                key={course.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-border/40 bg-surface/10 hover:bg-surface/20 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-surface/40 flex items-center justify-center text-muted-foreground/40 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-bold tracking-tight text-foreground">{course.name}</h4>
                    <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-wider">
                      {course.status === "completed" ? "Finalizado" : course.status === "in_progress" ? "Em andamento" : "Não iniciado"}
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
                  
                  <Button variant="ghost" size="sm" className="h-9 px-4 rounded-full text-muted-foreground/40 hover:text-primary font-black uppercase text-[10px] tracking-widest">
                    Ações <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center rounded-2xl border border-dashed border-border/40 bg-surface/5">
              <p className="text-sm text-muted-foreground font-medium">Nenhum curso disponível.</p>
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
