import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Clock, Layers, ListChecks, Play, Sparkles, Target } from "lucide-react";
import { useMemo } from "react";
import { useDashboardState } from "@/features/dashboard/hooks/use-dashboard-state";
import { NextStepAction, MiniStatCard } from "@/features/dashboard/components/dashboard-ui";

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
import {
  useRecentStudySessions,
  useStudySessionSecondsSince,
} from "@/features/study-sessions/hooks";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const { data: prefs } = usePreferences();
  const { priority, data, isLoading, dueFlashcards } = useDashboardState();
  
  const sinceIso = useMemo(() => startOfDayIso(profile?.timezone), [profile?.timezone]);
  const { data: todaySeconds } = useStudySessionSecondsSince(sinceIso);
  
  const greeting = greetingForNow(profile?.timezone);
  const displayName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "estudante";

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground">{greeting}, {displayName}.</h1>
        <p className="text-muted-foreground">O que vamos aprender hoje?</p>
      </div>

      {priority === "review" && (
        <NextStepAction
          title="Revisão Urgente"
          subtitle={`🧠 Revisar agora (${data.count} cartões)`}
          description="Você tem revisões pendentes. Recupere esse conhecimento antes de seguir."
          ctaText="Revisar agora"
          to="/app/revisar"
          icon={Layers}
        />
      )}

      {priority === "resume" && (
        <NextStepAction
          title="Continue de onde parou"
          subtitle={STUDY_METHOD_LABELS[data.session.method]}
          description="Você tem uma sessão de estudo não finalizada."
          ctaText="Retomar agora"
          to="/app/estudar"
          search={{ method: data.session.method }}
          icon={Play}
        />
      )}

      {priority === "recommendation" && (
        <NextStepAction
          title="Próximo passo recomendado"
          subtitle={`Continuar ${data.course.name}`}
          description={`Seu progresso atual é de ${data.progress.percent}%.`}
          ctaText="Estudar agora"
          to="/app/meus-estudos/$areaId/cursos/$courseId"
          params={{ areaId: data.course.study_area_id, courseId: data.course.id }}
          icon={Target}
        />
      )}

      {priority === "start_study" && (
        <NextStepAction
          title="Começar a estudar"
          subtitle={`Iniciar ${data.course.name}`}
          description="Você já tem conteúdo disponível. Escolha um método e comece agora."
          ctaText="Começar estudo"
          to="/app/meus-estudos/$areaId/cursos/$courseId"
          params={{ areaId: data.course.study_area_id, courseId: data.course.id }}
          icon={BookOpen}
        />
      )}
      
      {priority === "onboarding" && (
        <NextStepAction
          title="Seu primeiro passo"
          subtitle="Vamos começar sua jornada?"
          description="Crie sua primeira área de estudo ou curso para ativar o DominusApp."
          ctaText="Criar primeira área"
          to="/app/meus-estudos"
          icon={Sparkles}
        />
      )}

      {priority === "maintenance" && (
        <NextStepAction
          title="Você está em dia"
          subtitle="Nenhuma pendência urgente"
          description="Que tal cadastrar um novo curso ou revisar seus materiais?"
          ctaText="Abrir biblioteca"
          to="/app/biblioteca"
          icon={ListChecks}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MiniStatCard 
            title="Estudos hoje" 
            value={Math.round((todaySeconds ?? 0) / 60)} 
            unit="min" 
            description={`Meta: ${prefs?.daily_study_goal_minutes ?? 60} min`}
          />
          <MiniStatCard 
            title="Revisões" 
            value={dueFlashcards?.length ?? 0} 
            description={dueFlashcards?.length ? "Cartões pendentes" : "Tudo em dia"}
          />
      </div>
    </div>
  );
}

/**
 * Sempre visível com números reais, mesmo em 0 min — diferente da taxa de
 * retenção de flashcards (indefinida sem revisões), 0 minutos hoje contra
 * uma meta real é um "0%" honesto, não um dado fabricado.
 */
function DailyGoalProgress({
  todaySeconds,
  goalMinutes,
}: {
  todaySeconds: number;
  goalMinutes: number;
}) {
  const todayMinutes = Math.round(todaySeconds / 60);
  const goalSeconds = goalMinutes * 60;
  const percent =
    goalSeconds > 0 ? Math.min(100, Math.round((todaySeconds / goalSeconds) * 100)) : 0;

  return (
    <div className="space-y-4 rounded-2xl border border-border/50 bg-surface/40 backdrop-blur-sm px-5 py-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {todayMinutes}/{goalMinutes} min
        </span>
        <span className="text-xs text-muted-foreground">{percent}%</span>
      </div>
      <Progress value={percent} />
    </div>
  );
}

function ShortcutCard({ 
  to, 
  title, 
  icon, 
  search 
}: { 
  to: string; 
  title: string; 
  icon: React.ReactNode;
  search?: any;
}) {
  return (
    <Link
      to={to}
      search={search}
      className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-surface/40 backdrop-blur-sm px-5 py-4 transition-all hover:border-primary/40 hover:bg-surface/60 hover:shadow-md active:scale-95"
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="text-sm font-medium text-foreground group-hover:text-foreground">
        {title}
      </span>
    </Link>
  );
}

function greetingForNow(timezone?: string): string {
  const tz = resolveTimezone(timezone);
  try {
    const hour = Number(
      new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: tz }).format(
        new Date(),
      ),
    );
    if (hour < 5) return "Boa madrugada";
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  } catch {
    return "Olá";
  }
}
