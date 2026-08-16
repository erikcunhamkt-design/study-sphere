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
import { useNextBestAction } from "@/features/next-action/hooks/use-next-best-action";
import { OnboardingHome } from "@/features/onboarding/components/onboarding-home";
import { 
  NextStepAction, 
  DayProgress, 
  MasteryCard, 
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

export function AddContentDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onOpenChange(false);
              navigate({ to: "/app/meus-estudos" });
            }}
          />
          <AddOptionCard 
            icon={FileText}
            title="PDF"
            description="Importe materiais e documentos de estudo."
            onClick={() => {
              onOpenChange(false);
              navigate({ to: "/app/biblioteca", search: { tab: "materials" } });
            }}
          />
          <AddOptionCard 
            icon={Book}
            title="Livro"
            description="Cadastre livros e referências bibliográficas."
            onClick={() => {
              onOpenChange(false);
              navigate({ to: "/app/biblioteca", search: { tab: "materials" } });
            }}
          />
          <AddOptionCard 
            icon={Type}
            title="Texto"
            description="Crie e organize suas próprias anotações."
            onClick={() => {
              onOpenChange(false);
              navigate({ to: "/app/biblioteca", search: { tab: "materials" } });
            }}
          />
          <AddOptionCard 
            icon={LinkIcon}
            title="Link"
            description="Salve páginas da web e materiais online."
            onClick={() => {
              onOpenChange(false);
              navigate({ to: "/app/biblioteca", search: { tab: "materials" } });
            }}
          />
          <AddOptionCard 
            icon={Layers}
            title="Baralho"
            description="Conjunto de flashcards para memorização."
            onClick={() => {
              onOpenChange(false);
              navigate({ to: "/app/biblioteca", search: { tab: "decks" } });
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DashboardPage() {
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const { data: prefs } = usePreferences();
  const { primary: action, isLoading, dashboard, reviewSemantic, hasActivity } = useNextBestAction() as any;
  const deleteSession = useDeleteStudySession();
  const navigate = useNavigate();
  
  const [addContentOpen, setAddContentOpen] = useState(false);
  
  const sinceIso = useMemo(() => startOfDayIso(profile?.timezone), [profile?.timezone]);
  const { data: todaySeconds } = useStudySessionSecondsSince(sinceIso);
  
  const greeting = greetingForNow(profile?.timezone);
  const displayName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "estudante";

  const studyMinutes = Math.round((todaySeconds ?? 0) / 60);
  const studyGoal = prefs?.daily_study_goal_minutes ?? 60;
  const reviewsCount = dashboard?.summary?.dueReviews || 0;

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
    <div className="max-w-5xl mx-auto space-y-10 px-6 md:px-8 py-8 md:py-12">
      {/* Primeira experiência guiada (some sozinha após o primeiro ciclo) */}
      <OnboardingHome onAddContent={() => setAddContentOpen(true)} />

      {/* Header Contextual */}
      <div className="space-y-0.5">
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground">{greeting}, {displayName}.</h1>
        <p className="text-lg md:text-xl text-muted-foreground/40 font-medium tracking-tight">O que vamos aprender hoje?</p>
      </div>

      {/* 1. HERO — AÇÃO PRINCIPAL */}
      <div className="w-full">
        <NextStepAction
          title={action.title.toUpperCase()}
          subtitle={action.description}
          description={action.reason}
          ctaText={action.cta}
          to={
            action.type === 'resume' ? "/app/estudar" :
            action.type === 'review' ? "/app/revisar" :
            action.type === 'test_memory' ? "/app/estudar" :
            action.type === 'reinforce' ? "/app/desempenho" :
            action.type === 'continue' || action.type === 'first_study' ? "/app/meus-estudos/$areaId/cursos/$courseId" :
            undefined
          }
          search={
            action.type === 'resume' ? { 
              method: action.metadata?.session?.method,
              lessonId: action.metadata?.session?.lesson_id 
            } : 
            action.type === 'test_memory' ? {} :
            undefined
          }
          params={
            (action.type === 'continue' || action.type === 'first_study') ? {
              areaId: action.metadata?.course?.study_area_id || action.metadata?.study_area_id,
              courseId: action.targetId
            } : undefined
          }
          onClick={action.type === 'add_content' ? () => setAddContentOpen(true) : undefined}
          icon={
            action.type === 'resume' ? Play :
            action.type === 'review' ? Layers :
            action.type === 'reinforce' ? Target :
            action.type === 'test_memory' ? Sparkles :
            action.type === 'continue' ? Target :
            action.type === 'first_study' ? BookOpen :
            action.type === 'add_content' ? Sparkles :
            ListChecks
          }
          onSecondaryAction={action.type === 'resume' && action.metadata?.session?.is_free_session ? async () => {
            try {
              await deleteSession.mutateAsync(action.targetId!);
              toast.success("Sessão encerrada");
            } catch (err) {
              toast.error("Erro ao encerrar sessão");
            }
          } : undefined}
          secondaryActionLabel={action.type === 'resume' && action.metadata?.session?.is_free_session ? "Encerrar sessão" : undefined}
        />
      </div>

      {/* 2. SEU DIA & 3. SEU DOMÍNIO */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
        <div className="md:col-span-3">
          <DayProgress current={studyMinutes} goal={studyGoal} reviews={reviewsCount} state={reviewSemantic} />
        </div>
        <div className="md:col-span-2">
          <MasteryCard state={reviewSemantic} />
        </div>
      </div>

      {/* Modal de Adicionar Conteúdo */}
      <AddContentDialog open={addContentOpen} onOpenChange={setAddContentOpen} />
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
