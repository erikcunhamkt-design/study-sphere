import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  BookOpen, 
  Layers, 
  ListChecks, 
  Play, 
  Sparkles, 
  Target,
  FileText,
  Book,
  Link as LinkIcon,
  Type
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const { data: prefs } = usePreferences();
  const { priority, data, isLoading, dueFlashcards, hasActivity } = useDashboardState();
  const deleteSession = useDeleteStudySession();
  const navigate = useNavigate();
  
  const [addContentOpen, setAddContentOpen] = useState(false);
  
  const sinceIso = useMemo(() => startOfDayIso(profile?.timezone), [profile?.timezone]);
  const { data: todaySeconds } = useStudySessionSecondsSince(sinceIso);
  
  const greeting = greetingForNow(profile?.timezone);
  const displayName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "estudante";

  const studyMinutes = Math.round((todaySeconds ?? 0) / 60);
  const studyGoal = prefs?.daily_study_goal_minutes ?? 60;
  const reviewsCount = dueFlashcards?.length ?? 0;

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-12 px-6 md:px-8 pt-8">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-64 w-full rounded-[2rem]" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <Skeleton className="md:col-span-3 h-40 rounded-[1.5rem]" />
          <Skeleton className="md:col-span-2 h-40 rounded-[1.5rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 px-6 md:px-8 pt-8">
      {/* Header Contextual */}
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-foreground">{greeting}, {displayName}.</h1>
        <p className="text-xl text-muted-foreground font-medium tracking-tight">O que vamos aprender hoje?</p>
      </div>

      {/* 1. HERO — AÇÃO PRINCIPAL */}
      <div className="w-full">
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
            onClick={() => setAddContentOpen(true)}
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
      </div>

      {/* 2. SEU DIA & 3. SEU DOMÍNIO */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        <div className="md:col-span-3 h-full">
          <DayProgress current={studyMinutes} goal={studyGoal} reviews={reviewsCount} />
        </div>
        <div className="md:col-span-2 h-full">
          <MasteryCard />
        </div>
      </div>

      {/* Modal de Adicionar Conteúdo */}
      <Dialog open={addContentOpen} onOpenChange={setAddContentOpen}>
        <DialogContent className="max-w-2xl bg-surface/95 backdrop-blur-xl border-border/40 rounded-[2rem] p-8">
          <DialogHeader className="space-y-3 mb-8">
            <DialogTitle className="text-3xl font-black tracking-tight">O que você quer adicionar?</DialogTitle>
            <DialogDescription className="text-base font-medium text-muted-foreground">
              Escolha o formato ideal para organizar seu conhecimento.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AddOptionCard 
              icon={BookOpen}
              title="Curso"
              description="Estruture seu estudo em módulos e aulas."
              onClick={() => {
                setAddContentOpen(false);
                navigate({ to: "/app/meus-estudos" });
              }}
            />
            <AddOptionCard 
              icon={FileText}
              title="PDF"
              description="Importe materiais e documentos de estudo."
              onClick={() => {
                setAddContentOpen(false);
                navigate({ to: "/app/biblioteca", search: { tab: "materials" } });
              }}
            />
            <AddOptionCard 
              icon={Book}
              title="Livro"
              description="Cadastre livros e referências bibliográficas."
              onClick={() => {
                setAddContentOpen(false);
                navigate({ to: "/app/biblioteca", search: { tab: "materials" } });
              }}
            />
            <AddOptionCard 
              icon={Type}
              title="Texto"
              description="Crie e organize suas próprias anotações."
              onClick={() => {
                setAddContentOpen(false);
                navigate({ to: "/app/biblioteca", search: { tab: "materials" } });
              }}
            />
            <AddOptionCard 
              icon={LinkIcon}
              title="Link"
              description="Salve páginas da web e materiais online."
              onClick={() => {
                setAddContentOpen(false);
                navigate({ to: "/app/biblioteca", search: { tab: "materials" } });
              }}
            />
            <AddOptionCard 
              icon={Layers}
              title="Baralho"
              description="Conjunto de flashcards para memorização."
              onClick={() => {
                setAddContentOpen(false);
                navigate({ to: "/app/biblioteca", search: { tab: "decks" } });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddOptionCard({ 
  icon: Icon, 
  title, 
  description, 
  onClick 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  onClick: () => void 
}) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-start p-6 text-left rounded-2xl border border-border/40 bg-surface/50 transition-all hover:bg-primary/5 hover:border-primary/20 hover:scale-[1.02] active:scale-[0.98] group"
    >
      <div className="p-3 rounded-xl bg-primary/5 text-primary mb-4 group-hover:bg-primary/10 transition-colors">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-black tracking-tight text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground font-medium leading-relaxed">{description}</p>
    </button>
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
