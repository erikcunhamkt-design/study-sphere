import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Clock, Layers, ListChecks, PlayCircle, Sparkles, Target } from "lucide-react";

import { EmptyState, PageHeader, Section } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-preferences";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const displayName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "estudante";
  const greeting = greetingForNow(profile?.timezone);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting}, ${displayName}.`}
        description="O que vamos aprender hoje?"
      />

      {/* Destaque principal */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-surface to-surface p-6 md:p-8">
        <div className="max-w-xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Comece por aqui
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Comece organizando seus estudos
          </h2>
          <p className="text-sm text-muted-foreground">
            Crie áreas de conhecimento, cadastre seus cursos e traga suas anotações — o restante do
            StudyOS conecta tudo automaticamente.
          </p>
          <div className="pt-2">
            <Button asChild size="lg">
              <Link to="/app/estudos">
                <BookOpen className="mr-2 h-4 w-4" aria-hidden /> Ir para Estudos
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Section title="Continuar estudando">
          <EmptyState
            icon={<PlayCircle className="h-5 w-5" aria-hidden />}
            title="Você ainda não iniciou nenhuma aula"
            description="Depois que você adicionar cursos e módulos, o retorno rápido aparece aqui."
          />
        </Section>

        <Section title="Revisões de hoje">
          <EmptyState
            icon={<Layers className="h-5 w-5" aria-hidden />}
            title="Nenhuma revisão programada"
            description="Flashcards e revisão espaçada serão exibidos aqui assim que existirem cartões."
          />
        </Section>

        <Section title="Meta diária">
          <EmptyState
            icon={<Target className="h-5 w-5" aria-hidden />}
            title="Sem sessões registradas hoje"
            description="Ao iniciar uma sessão de estudo, o progresso da meta aparecerá aqui."
          />
        </Section>

        <Section title="Cursos em andamento">
          <EmptyState
            icon={<BookOpen className="h-5 w-5" aria-hidden />}
            title="Nenhum curso iniciado ainda"
            description="Crie seu primeiro curso em Estudos para acompanhar o progresso."
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/app/estudos">Abrir Estudos</Link>
              </Button>
            }
          />
        </Section>
      </div>

      <Section title="Atividades recentes">
        <EmptyState
          icon={<Clock className="h-5 w-5" aria-hidden />}
          title="Nenhuma atividade registrada"
          description="Sessões, questões respondidas e revisões aparecerão aqui em ordem cronológica."
        />
      </Section>

      <Section title="Atalhos">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ShortcutCard to="/app/questoes" title="Resolver questões" icon={<ListChecks className="h-4 w-4" aria-hidden />} />
          <ShortcutCard to="/app/planejamento" title="Planejar semana" icon={<Target className="h-4 w-4" aria-hidden />} />
          <ShortcutCard to="/app/biblioteca" title="Abrir biblioteca" icon={<BookOpen className="h-4 w-4" aria-hidden />} />
        </div>
      </Section>
    </div>
  );
}

function ShortcutCard({ to, title, icon }: { to: string; title: string; icon: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-border bg-surface/60 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-surface"
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="text-sm font-medium text-foreground group-hover:text-foreground">{title}</span>
    </Link>
  );
}

function greetingForNow(timezone?: string): string {
  const tz = timezone || "America/Sao_Paulo";
  try {
    const hour = Number(
      new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date()),
    );
    if (hour < 5) return "Boa madrugada";
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  } catch {
    return "Olá";
  }
}
