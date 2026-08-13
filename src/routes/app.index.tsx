import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Layers, ListChecks, Play, Sparkles, Target } from "lucide-react";
import { useMemo } from "react";
import { useDashboardState } from "@/features/dashboard/hooks/use-dashboard-state";
import { 
  NextStepAction, 
  DayProgress, 
  MasteryCard, 
  SectionHeader, 
  SimpleEmptyState 
} from "@/features/dashboard/components/dashboard-ui";

import { Skeleton } from "@/components/ui/skeleton";
import { useProfile, usePreferences } from "@/hooks/use-preferences";
import { useAuth } from "@/hooks/use-auth";
import { resolveTimezone, startOfDayIso } from "@/lib/timezone";
import { STUDY_METHOD_LABELS } from "@/features/study-sessions/labels";
import { useStudySessionSecondsSince } from "@/features/study-sessions/hooks";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const { data: prefs } = usePreferences();
  const { priority, data, isLoading, dueFlashcards, hasActivity } = useDashboardState();
  
  const sinceIso = useMemo(() => startOfDayIso(profile?.timezone), [profile?.timezone]);
  const { data: todaySeconds } = useStudySessionSecondsSince(sinceIso);
  
  const greeting = greetingForNow(profile?.timezone);
  const displayName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "estudante";

  const studyMinutes = Math.round((todaySeconds ?? 0) / 60);
  const studyGoal = prefs?.daily_study_goal_minutes ?? 60;
  const reviewsCount = dueFlashcards?.length ?? 0;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-10 px-4 md:px-0">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      {/* Header Contextual - Mais compacto */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-foreground">{greeting}, {displayName}.</h1>
        <p className="text-lg text-muted-foreground font-medium tracking-tight">O que vamos aprender hoje?</p>
      </div>

      {/* 1. HERO — AÇÃO PRINCIPAL (Reduzido e Compacto) */}
      {priority === "review" && (
        <NextStepAction
          title="Sua Próxima Ação"
          subtitle="Revisar agora"
          description={`Você tem ${data.count} revisões pendentes. Recupere esses conceitos antes de avançar.`}
          ctaText="Começar revisão"
          to="/app/revisar"
          estimatedMinutes={data.estimatedMinutes}
          icon={Layers}
        />
      )}

      {priority === "resume" && (
        <NextStepAction
          title="Sua Próxima Ação"
          subtitle={`Retomar ${STUDY_METHOD_LABELS[data.session.method]}`}
          description="Você tem uma sessão em andamento. Finalize agora para manter o ritmo."
          ctaText="Continuar agora"
          to="/app/estudar"
          search={{ method: data.session.method }}
          icon={Play}
        />
      )}

      {priority === "recommendation" && (
        <NextStepAction
          title="Sua Próxima Ação"
          subtitle={`Continuar ${data.course.name}`}
          description={`Progresso de ${data.progress.percent}%. Vamos para o próximo módulo?`}
          ctaText="Estudar agora"
          to="/app/meus-estudos/$areaId/cursos/$courseId"
          params={{ areaId: data.course.study_area_id, courseId: data.course.id }}
          icon={Target}
        />
      )}

      {priority === "start_study" && (
        <NextStepAction
          title="Sua Próxima Ação"
          subtitle={`Iniciar ${data.course.name}`}
          description="Conteúdo disponível. Escolha um método e inicie sua primeira sessão."
          ctaText="Começar estudo"
          to="/app/meus-estudos/$areaId/cursos/$courseId"
          params={{ areaId: data.course.study_area_id, courseId: data.course.id }}
          icon={BookOpen}
        />
      )}
      
      {priority === "onboarding" && (
        <NextStepAction
          title="Primeiro Passo"
          subtitle="Vamos começar?"
          description="Crie sua primeira área de estudo para ativar o DominusApp."
          ctaText="Criar área"
          to="/app/meus-estudos"
          icon={Sparkles}
        />
      )}

      {priority === "maintenance" && (
        <NextStepAction
          title="Em dia"
          subtitle="Nenhuma pendência urgente"
          description="Que tal cadastrar um novo curso ou revisar seus materiais?"
          ctaText="Abrir biblioteca"
          to="/app/biblioteca"
          icon={ListChecks}
        />
      )}

      {/* 2. SEU DIA & 3. SEU DOMÍNIO (Grid Refinado) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-3">
          <DayProgress current={studyMinutes} goal={studyGoal} reviews={reviewsCount} />
        </div>
        <div className="md:col-span-2">
          <MasteryCard />
        </div>
      </div>

      {/* 4. PRIMEIRO ESTUDO (Apenas se necessário) */}
      {!hasActivity && priority !== "review" && priority !== "resume" && (
        <div className="pt-4 border-t border-border/20">
          <SectionHeader title="Conteúdo inicial" />
          <SimpleEmptyState 
            title="Ainda não iniciou um estudo."
            description="Escolha um assunto e comece sua primeira sessão para o domínio."
            ctaText="Explorar meus estudos"
            to="/app/meus-estudos"
          />
        </div>
      )}
    </div>
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
