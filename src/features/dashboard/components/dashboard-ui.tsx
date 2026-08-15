import { BookOpen, Brain, ChevronRight, Clock, Layers, ListChecks, Play, Sparkles, Target, Activity, TrendingUp } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useDomainModel } from "@/features/performance/hooks/use-domain-model";

export function NextStepAction({
  title,
  subtitle,
  description,
  ctaText,
  to,
  search,
  params,
  estimatedMinutes,
  icon: Icon = Sparkles,
  context,
  onSecondaryAction,
  secondaryActionLabel,
  onClick,
}: {
  title: string;
  subtitle?: string;
  description: string;
  ctaText: string;
  to?: string;
  search?: any;
  params?: any;
  estimatedMinutes?: number;
  icon?: React.ElementType;
  context?: string;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-4 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/[0.03] px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-primary/80 ring-1 ring-primary/10 select-none">
            <Icon className="h-3 w-3" />
            {title}
          </div>
          <div className="max-w-[80%]">
            {context && (
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{context}</p>
            )}
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground leading-[1.15]">{subtitle}</h2>
            <p className="mt-3 text-sm md:text-base text-muted-foreground/70 leading-relaxed font-medium">{description}</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
          {estimatedMinutes && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-widest bg-surface/50 px-4 py-2 rounded-full border border-border/50">
              <Clock className="h-3 w-3" />
              <span>{estimatedMinutes} min</span>
            </div>
          )}
          {to ? (
            <Button asChild size="lg" className="rounded-full px-8 h-12 font-black tracking-widest text-[11px] shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
              <Link to={to} search={search} params={params}>
                {ctaText} <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          ) : (
            <Button onClick={onClick} size="lg" className="rounded-full px-8 h-12 font-black tracking-widest text-[11px] shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
              {ctaText} <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          )}
        </div>
      </div>
      
      {onSecondaryAction && secondaryActionLabel && (
        <div className="mt-6 flex justify-end md:absolute md:bottom-6 md:right-8 md:mt-0">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-auto p-0 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 hover:text-muted-foreground hover:bg-transparent transition-colors"
            onClick={onSecondaryAction}
          >
            {secondaryActionLabel}
          </Button>
        </div>
      )}
    </>
  );

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-gradient-to-br from-primary/[0.08] via-surface/40 to-surface/90 p-8 md:p-10 shadow-sm transition-all hover:shadow-md hover:border-border/60 min-h-[220px] flex flex-col justify-center">
      {content}
    </div>
  );
}

export function DayProgress({ current, goal, reviews, state }: { current: number; goal: number; reviews: number; state?: any }) {
  const percent = Math.min(Math.round((current / goal) * 100), 100);
  
  return (
    <div className="rounded-[2rem] border border-border/40 bg-surface/20 p-6 flex flex-col justify-center">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">Progresso do Dia</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tighter text-foreground">{current} / {goal}</span>
            <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">min</span>
          </div>
        </div>
        <div className="text-left sm:text-right space-y-1">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">Revisões</p>
          <p className={cn("text-xl font-black tracking-tight", reviews > 0 ? "text-primary/90" : "text-emerald-500/60")}>
            {reviews > 0 ? `${reviews} ${reviews === 1 ? 'revisão' : 'revisões'}` : (state === "new_user" ? "Inicie sua memória" : "Tudo em dia")}
          </p>
        </div>
      </div>
      
      <div className="mt-4 space-y-2">
        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/20 select-none">
          <span className="flex items-center gap-1.5">
            {percent}% <span className="opacity-50">concluído</span>
          </span>
          {percent >= 100 && <span className="text-emerald-500/40">Meta atingida</span>}
        </div>
        <Progress value={percent} className="h-1 bg-surface/40 rounded-full" />
      </div>
    </div>
  );
}

export function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-4">{title}</h3>
  );
}

export function MasteryCard({ state }: { state?: any }) {
  const { data: domains, isLoading } = useDomainModel();

  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-border/40 bg-surface/20 p-6 h-[180px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
      </div>
    );
  }

  if (!domains || domains.length === 0) {
    return (
      <div className="rounded-[2rem] border border-border/40 bg-surface/20 p-6 shadow-sm hover:border-primary/10 transition-all group flex flex-col justify-center h-[180px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">Mapa de Domínio</h3>
          <Brain className="h-3.5 w-3.5 text-muted-foreground/10 group-hover:text-primary/20 transition-colors" />
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-lg font-black tracking-tight text-foreground leading-snug">Seu mapa está começando.</p>
            <p className="text-[11px] text-muted-foreground/40 leading-relaxed font-medium max-w-[90%]">
              Adicione conteúdo e comece a estudar para gerar os primeiros dados de memória.
            </p>
          </div>
          <div className="pt-1">
            <span className="text-[9px] font-black text-primary/60 uppercase tracking-[0.2em] select-none">
              PRIMEIRA SESSÃO NECESSÁRIA
            </span>
          </div>
        </div>
      </div>
    );
  }

  const topDomains = domains.slice(0, 2);

  return (
    <div className="rounded-[2rem] border border-border/40 bg-surface/20 p-6 shadow-sm hover:border-primary/10 transition-all group flex flex-col justify-center h-[180px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">Mapa de Domínio</h3>
        <Link to="/app/desempenho" className="text-[9px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors">
          Ver todos
        </Link>
      </div>
      
      <div className="space-y-4">
        {topDomains.map(domain => (
          <div key={domain.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground truncate max-w-[120px]">{domain.name}</span>
              <span className={cn("text-[8px] font-black uppercase tracking-widest", domain.mastery.color)}>
                {domain.mastery.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-surface/40 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary/40 rounded-full transition-all duration-500" 
                  style={{ width: `${(domain.metrics.evaluatedConcepts / Math.max(domain.metrics.totalConcepts, 1)) * 100}%` }}
                />
              </div>
              <span className="text-[8px] font-bold text-muted-foreground/40">
                {domain.metrics.evaluatedConcepts}/{domain.metrics.totalConcepts}
              </span>
            </div>
          </div>
        ))}

        {domains.length > 2 && (
          <p className="text-[9px] font-bold text-muted-foreground/20 uppercase tracking-widest text-center pt-1">
            + {domains.length - 2} áreas acompanhadas
          </p>
        )}
      </div>
    </div>
  );
}

export function SimpleEmptyState({ title, description, ctaText, to, params }: { title: string; description: string; ctaText: string; to: string; params?: any }) {
  return (
    <div className="rounded-[1.5rem] border border-border/40 bg-surface/20 p-8 shadow-sm transition-all hover:border-border/60">
      <div className="space-y-6">
        <div className="space-y-2">
          <h4 className="text-lg font-black tracking-tight text-foreground">{title}</h4>
          <p className="text-sm text-muted-foreground/60 max-w-md leading-relaxed font-medium">{description}</p>
        </div>
        <Button asChild variant="secondary" size="sm" className="rounded-full px-6 font-black uppercase tracking-widest text-[10px]">
          <Link to={to} params={params}>{ctaText} <ChevronRight className="ml-1.5 h-3.5 w-3.5" /></Link>
        </Button>
      </div>
    </div>
  );
}
