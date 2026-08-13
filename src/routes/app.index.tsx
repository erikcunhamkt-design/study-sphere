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
import { useStudySessionSecondsSince, useDeleteStudySession } from "@/features/study-sessions/hooks";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const { data: prefs } = usePreferences();
  const { priority, data, isLoading, dueFlashcards, hasActivity } = useDashboardState();
  const deleteSession = useDeleteStudySession();
  
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

      {/* 1. HERO — AÇÃO PRINCIPAL */}
      {priority === "resume" && (
        <NextStepAction
          title="Retomar"
          subtitle={data.displayTitle}
          context={data.displayContext}
          description={
            data.displaySecondary 
              ? `${data.displaySecondary}. Continue de onde parou.`
              : data.isFree
                ? "Continue sua sessão de estudo livre."
                : "Retome sua sessão para registrar seu progresso."
          }
          ctaText="Continuar agora"
          to="/app/estudar"
          search={{ 
            method: data.session.method,
            lessonId: data.session.lesson_id 
          }}
          icon={Play}
          onSecondaryAction={data.isFree ? async () => {
            try {
              await deleteSession.mutateAsync(data.session.id);
              toast.success("Sessão encerrada");
            } catch (err) {
              toast.error("Erro ao encerrar sessão");
            }
          } : undefined}
          secondaryActionLabel={data.isFree ? "Encerrar sessão" : undefined}
        />
      )}

      {priority === "review" && (
        <NextStepAction
          title="Sua próxima ação"
          subtitle="Revisar agora"
          description={`Você tem ${reviewsCount} ${reviewsCount === 1 ? 'revisão pendente' : 'revisões pendentes'}. Recupere esses conceitos antes de avançar.`}
          ctaText="Começar revisão"
          to="/app/revisar"
          estimatedMinutes={data.estimatedMinutes}
          icon={Layers}
        />
      )}

      {priority === "recommendation" && (
        <NextStepAction
          title="Próxima recomendação"
          subtitle={`Continuar ${data.course.name}`}
          description={`Você já concluiu ${data.progress.percent}% deste curso. Vamos para a próxima etapa?`}
          ctaText="Estudar agora"
          to="/app/meus-estudos/$areaId/cursos/$courseId"
          params={{ areaId: data.course.study_area_id, courseId: data.course.id }}
          icon={Target}
        />
      )}

      {priority === "start_study" && (
        <NextStepAction
          title="Próximo passo"
          subtitle="Escolha seu primeiro estudo"
          description="Você já possui conteúdo disponível. Escolha por onde começar."
          ctaText="Começar estudo"
          to="/app/meus-estudos/$areaId/cursos/$courseId"
          params={{ areaId: data.course.study_area_id, courseId: data.course.id }}
          icon={BookOpen}
        />
      )}
      
      {priority === "onboarding" && (
        <NextStepAction
          title="Comece sua jornada"
          subtitle="Comece seu primeiro estudo"
          description="Adicione um conteúdo e dê início à sua primeira sessão."
          ctaText="Adicionar conteúdo"
          to="/app/meus-estudos"
          icon={Sparkles}
        />
      )}

      {priority === "maintenance" && (
        <NextStepAction
          title="Tudo em dia"
          subtitle="Continue avançando"
          description="Nenhuma revisão pendente. Escolha seu próximo passo de aprendizagem."
          ctaText="Continuar estudando"
          to="/app/meus-estudos/$areaId/cursos/$courseId"
          params={{ 
            areaId: data.course?.study_area_id, 
            courseId: data.course?.id 
          }}
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
