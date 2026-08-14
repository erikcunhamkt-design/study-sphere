import { BookOpen, Brain, ChevronRight, Clock, Layers, ListChecks, Play, Sparkles, Target } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

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
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-primary ring-1 ring-primary/20">
            <Icon className="h-3 w-3" />
            {title}
          </div>
          <div className="max-w-[85%]">
            {context && (
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">{context}</p>
            )}
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground leading-[1.15]">{subtitle}</h2>
            <p className="mt-2 text-sm md:text-base text-muted-foreground leading-relaxed font-medium">{description}</p>
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
            <Button asChild size="lg" className="rounded-full px-8 h-12 font-black tracking-widest text-[11px] shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
              <Link to={to} search={search} params={params}>
                {ctaText} <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button onClick={onClick} size="lg" className="rounded-full px-8 h-12 font-black tracking-widest text-[11px] shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
              {ctaText} <ChevronRight className="ml-2 h-4 w-4" />
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
    <div className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-gradient-to-br from-primary/[0.08] via-surface/40 to-surface/90 p-8 md:p-10 shadow-sm transition-all hover:shadow-md hover:border-border/60">
      {content}
    </div>
  );
}

export function DayProgress({ current, goal, reviews }: { current: number; goal: number; reviews: number }) {
  const percent = Math.min(Math.round((current / goal) * 100), 100);
  
  return (
    <div className="rounded-[2rem] border border-border/40 bg-surface/20 p-8 space-y-8">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Progresso do Dia</h3>
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tighter text-foreground">{current} / {goal}</span>
              <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">min</span>
            </div>
            <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">Meta diária</p>
          </div>
        </div>
        <div className="text-left sm:text-right space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Revisões</p>
          <div className="flex flex-col items-start sm:items-end">
            <p className={cn("text-xl font-black tracking-tight", reviews > 0 ? "text-primary" : "text-emerald-500/70")}>
              {reviews > 0 ? `${reviews} ${reviews === 1 ? 'revisão' : 'revisões'}` : "Tudo em dia"}
            </p>
            {reviews === 0 && (
              <span className="text-[9px] font-black text-emerald-500/40 uppercase tracking-[0.2em]">Domínio mantido</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/20">
          <span>{percent}% concluído</span>
          {percent >= 100 && <span className="text-emerald-500/50">Meta atingida</span>}
        </div>
        <Progress value={percent} className="h-1 bg-surface/60 rounded-full" />
      </div>
    </div>
  );
}

export function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-4">{title}</h3>
  );
}

export function MasteryCard({ percent, trend }: { percent?: number; trend?: number }) {
  return (
    <div className="rounded-[2rem] border border-border/40 bg-surface/20 p-8 shadow-sm hover:border-primary/10 transition-all group h-full flex flex-col justify-between">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Mapa de Domínio</h3>
        <Brain className="h-3.5 w-3.5 text-muted-foreground/10 group-hover:text-primary/30 transition-colors" />
      </div>
      
      {percent === undefined ? (
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xl font-black tracking-tight text-foreground leading-snug">Seu nível ainda está sendo construído.</p>
            <p className="text-xs text-muted-foreground/50 leading-relaxed font-medium max-w-[90%]">
              O Dominus começará a identificar seus pontos fortes e lacunas conforme você estudar e responder questões.
            </p>
          </div>
          <div className="pt-2">
            <span className="text-[10px] font-black text-primary/80 uppercase tracking-[0.2em] select-none">
              Primeira sessão necessária
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black tracking-tighter text-foreground">{percent}%</span>
              <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Domínio</span>
            </div>
            {trend !== undefined && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-tighter">
                <Target className="h-3 w-3" />
                <span>↑ {trend}% esta semana</span>
              </div>
            )}
          </div>
        </div>
      )}
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
