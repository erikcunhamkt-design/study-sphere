import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Clock, Layers, ListChecks, PlayCircle, Sparkles, Target } from "lucide-react";
import { useMemo } from "react";
import { EmptyState, PageHeader, Section } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile, usePreferences } from "@/hooks/use-preferences";
import { useAuth } from "@/hooks/use-auth";
import { resolveTimezone, startOfDayIso } from "@/lib/timezone";
import { useAllCourses } from "@/features/studies/hooks/use-courses";
import { useAllCourseModules } from "@/features/studies/hooks/use-course-modules";
import { useAllLessons } from "@/features/studies/hooks/use-lessons";
import { useStudyAreas } from "@/features/studies/hooks/use-study-areas";
import { calculateCourseProgress, COURSE_STATUS_LABELS } from "@/features/studies/utils";
import { useDueFlashcards } from "@/features/flashcards/hooks";
import { STUDY_METHOD_LABELS } from "@/features/study-sessions/labels";
import { useRecentStudySessions, useStudySessionSecondsSince, } from "@/features/study-sessions/hooks";
export const Route = createFileRoute("/app/")({
    component: DashboardPage,
});
function DashboardPage() {
    const { data: profile } = useProfile();
    const { user } = useAuth();
    const { data: areas, isLoading: areasLoading } = useStudyAreas();
    const { data: courses, isLoading: coursesLoading } = useAllCourses();
    const { data: allModules } = useAllCourseModules();
    const { data: allLessons } = useAllLessons();
    const { data: prefs } = usePreferences();
    const { data: dueFlashcards, isLoading: dueFlashcardsLoading } = useDueFlashcards();
    const sinceIso = useMemo(() => startOfDayIso(profile?.timezone), [profile?.timezone]);
    const { data: todaySeconds, isLoading: todaySecondsLoading } = useStudySessionSecondsSince(sinceIso);
    const { data: recentSessions, isLoading: recentSessionsLoading } = useRecentStudySessions(5);
    const displayName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "estudante";
    const greeting = greetingForNow(profile?.timezone);
    const hasAreas = (areas?.length ?? 0) > 0;
    const activeCourses = (courses ?? []).filter((c) => !c.is_archived);
    const hasCourses = activeCourses.length > 0;
    const inProgressCourses = activeCourses.filter((c) => c.status === "in_progress");
    const hero = !hasAreas
        ? {
            title: "Comece organizando seus estudos",
            description: "Crie áreas de conhecimento, cadastre seus cursos e traga suas anotações — o restante do DominusApp conecta tudo automaticamente.",
            cta: "Criar primeira área",
        }
        : !hasCourses
            ? {
                title: "Cadastre seu primeiro curso",
                description: "Você já tem áreas de conhecimento — agora crie um curso dentro de uma delas.",
                cta: "Ir para Estudos",
            }
            : {
                title: "Continue de onde parou",
                description: "Acompanhe seus cursos em andamento e continue organizando seus estudos.",
                cta: "Ir para Estudos",
            };
    return (<div className="space-y-8">
      <PageHeader title={`${greeting}, ${displayName}.`} description="O que vamos aprender hoje?"/>

      {/* Destaque principal - Premium Hero with Bento-like feel */}
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/10 via-surface/40 to-surface/80 p-8 md:p-10 shadow-sm transition-all hover:shadow-md group">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl transition-all group-hover:bg-primary/10"/>
        <div className="relative max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Sparkles className="h-3.5 w-3.5" aria-hidden/>
            Comece por aqui
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground animate-in fade-in slide-in-from-bottom-3 duration-700 fill-mode-both">
            {hero.title}
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed max-w-md animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both">
            {hero.description}
          </p>
          <div className="pt-4 animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-300 fill-mode-both">
            <Button asChild size="lg" className="rounded-full px-8 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-95">
              <Link to="/app/estudos">
                <BookOpen className="mr-2 h-5 w-5" aria-hidden/> {hero.cta}
              </Link>
            </Button>
          </div>
        </div>
      </div>


      <div className="grid gap-8 md:grid-cols-2">
        <Section title="Continuar estudando">
          <EmptyState icon={<PlayCircle className="h-5 w-5" aria-hidden/>} title="Você ainda não iniciou nenhuma aula" description="Depois que você adicionar cursos e módulos, o retorno rápido aparece aqui."/>
        </Section>

        <Section title="Revisões de hoje">
          {dueFlashcardsLoading ? (<Skeleton className="h-14 w-full"/>) : !dueFlashcards || dueFlashcards.length === 0 ? (<EmptyState icon={<Layers className="h-5 w-5" aria-hidden/>} title="Nenhuma revisão programada" description="Flashcards e revisão espaçada serão exibidos aqui assim que existirem cartões devidos."/>) : (<div className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-surface/40 backdrop-blur-sm px-5 py-4 transition-all hover:border-primary/30 hover:shadow-sm">
              <div>
                <p className="text-2xl font-semibold text-foreground">{dueFlashcards.length}</p>
                <p className="text-xs text-muted-foreground">
                  {dueFlashcards.length === 1 ? "cartão devido" : "cartões devidos"} agora
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/app/estudar" search={{ method: "recordacao_ativa" }}>Revisar</Link>
              </Button>
            </div>)}
        </Section>

        <Section title="Meta diária">
          {todaySecondsLoading ? (<Skeleton className="h-14 w-full"/>) : (<DailyGoalProgress todaySeconds={todaySeconds ?? 0} goalMinutes={prefs?.daily_study_goal_minutes ?? 60}/>)}
        </Section>

        <Section title="Cursos em andamento">
          {areasLoading || coursesLoading ? (<div className="space-y-2">
              <Skeleton className="h-14 w-full"/>
              <Skeleton className="h-14 w-full"/>
            </div>) : inProgressCourses.length === 0 ? (<EmptyState icon={<BookOpen className="h-5 w-5" aria-hidden/>} title="Nenhum curso em andamento." description={hasCourses
                ? "Marque um curso como 'Em andamento' em Estudos para vê-lo aqui."
                : "Crie seu primeiro curso em Estudos para acompanhar o progresso."} action={<Button asChild variant="outline" size="sm">
                  <Link to="/app/estudos">Abrir Estudos</Link>
                </Button>}/>) : (<div className="space-y-2">
              {inProgressCourses.slice(0, 5).map((course) => {
                const courseModules = (allModules ?? []).filter((m) => m.course_id === course.id);
                const courseLessons = (allLessons ?? []).filter((l) => l.course_id === course.id);
                const progress = calculateCourseProgress(courseModules, courseLessons);
                return (<Link key={course.id} to="/app/estudos/$areaId/cursos/$courseId" params={{ areaId: course.study_area_id, courseId: course.id }} className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-surface/40 backdrop-blur-sm px-5 py-4 transition-all hover:border-primary/40 hover:bg-surface/60 hover:shadow-sm group">
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {course.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {progress.moduleCount === 1
                        ? "1 módulo"
                        : `${progress.moduleCount} módulos`}{" "}
                        · {progress.completedCount}/{progress.lessonCount} aulas ·{" "}
                        {progress.percent}%
                      </span>
                    </div>
                    <Badge variant="default" className="shrink-0 text-[10px]">
                      {COURSE_STATUS_LABELS[course.status]}
                    </Badge>
                  </Link>);
            })}
            </div>)}
        </Section>
      </div>

      <Section title="Atividades recentes" description="Só sessões de estudo por enquanto — flashcards e questões entram numa fase futura.">
        {recentSessionsLoading ? (<div className="space-y-2">
            <Skeleton className="h-14 w-full"/>
            <Skeleton className="h-14 w-full"/>
          </div>) : !recentSessions || recentSessions.length === 0 ? (<EmptyState icon={<Clock className="h-5 w-5" aria-hidden/>} title="Nenhuma atividade registrada" description="Conclua uma sessão em Estudar para vê-la aqui."/>) : (<div className="space-y-2">
            {recentSessions.map((session) => {
                const lesson = (allLessons ?? []).find((l) => l.id === session.lesson_id);
                const minutes = Math.round((session.duration_seconds ?? 0) / 60);
                return (<div key={session.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-surface/40 backdrop-blur-sm px-5 py-4 transition-all hover:border-primary/30">

                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {STUDY_METHOD_LABELS[session.method]}
                      {lesson ? ` · ${lesson.title}` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(session.started_at).toLocaleString("pt-BR")} · {minutes} min
                    </span>
                  </div>
                </div>);
            })}
          </div>)}
      </Section>

      <Section title="Atalhos">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ShortcutCard to="/app/estudar" search={{ method: "recordacao_ativa" }} title="Resolver questões" icon={<ListChecks className="h-4 w-4" aria-hidden/>}/>
          <ShortcutCard to="/app/planejamento" title="Planejar semana" icon={<Target className="h-4 w-4" aria-hidden/>}/>
          <ShortcutCard to="/app/biblioteca" title="Abrir biblioteca" icon={<BookOpen className="h-4 w-4" aria-hidden/>}/>
        </div>
      </Section>
    </div>);
}
/**
 * Sempre visível com números reais, mesmo em 0 min — diferente da taxa de
 * retenção de flashcards (indefinida sem revisões), 0 minutos hoje contra
 * uma meta real é um "0%" honesto, não um dado fabricado.
 */
function DailyGoalProgress({ todaySeconds, goalMinutes, }) {
    const todayMinutes = Math.round(todaySeconds / 60);
    const goalSeconds = goalMinutes * 60;
    const percent = goalSeconds > 0 ? Math.min(100, Math.round((todaySeconds / goalSeconds) * 100)) : 0;
    return (<div className="space-y-4 rounded-2xl border border-border/50 bg-surface/40 backdrop-blur-sm px-5 py-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {todayMinutes}/{goalMinutes} min
        </span>
        <span className="text-xs text-muted-foreground">{percent}%</span>
      </div>
      <Progress value={percent}/>
    </div>);
}
function ShortcutCard({ to, title, icon, search }) {
    return (<Link to={to} search={search} className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-surface/40 backdrop-blur-sm px-5 py-4 transition-all hover:border-primary/40 hover:bg-surface/60 hover:shadow-md active:scale-95">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="text-sm font-medium text-foreground group-hover:text-foreground">
        {title}
      </span>
    </Link>);
}
function greetingForNow(timezone) {
    const tz = resolveTimezone(timezone);
    try {
        const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date()));
        if (hour < 5)
            return "Boa madrugada";
        if (hour < 12)
            return "Bom dia";
        if (hour < 18)
            return "Boa tarde";
        return "Boa noite";
    }
    catch {
        return "Olá";
    }
}
