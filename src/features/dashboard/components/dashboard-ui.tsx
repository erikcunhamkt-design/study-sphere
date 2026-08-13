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
  context,
  onSecondaryAction,
  secondaryActionLabel,
}: {
  title: string;
  subtitle?: string;
  description: string;
  ctaText: string;
  to: string;
  search?: any;
  params?: any;
  estimatedMinutes?: number;
  icon?: React.ElementType;
  context?: string;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/10 via-surface/40 to-surface/80 p-6 md:px-8 md:py-6 shadow-sm transition-all hover:shadow-md">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary ring-1 ring-primary/20">
            <Icon className="h-3 w-3" />
            {title}
          </div>
          <div>
            {context && (
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{context}</p>
            )}
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{subtitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-lg leading-relaxed">{description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 shrink-0">
          {estimatedMinutes && (
            <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground font-semibold bg-surface/50 px-3 py-1.5 rounded-full border border-border/50">
              <Clock className="h-3 w-3" />
              <span>{estimatedMinutes} min</span>
            </div>
          )}
          <Button asChild size="default" className="rounded-full px-6 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
            <Link to={to} search={search} params={params}>
              {ctaText} <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
      
      {onSecondaryAction && secondaryActionLabel && (
        <div className="mt-4 flex justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-auto p-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 hover:text-muted-foreground hover:bg-transparent"
            onClick={onSecondaryAction}
          >
            {secondaryActionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export function DayProgress({ current, goal, reviews }: { current: number; goal: number; reviews: number }) {
  const percent = Math.min(Math.round((current / goal) * 100), 100);
  
  return (
    <div className="rounded-2xl border border-border/50 bg-surface/20 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Progresso do Dia</h3>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">{current} / {goal} min</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase bg-surface/50 px-2 py-0.5 rounded border border-border/50">{percent}%</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Pendente</p>
          <p className={cn("text-sm font-bold", reviews > 0 ? "text-primary" : "text-emerald-500")}>
            {reviews > 0 ? `${reviews} revisões` : "Em dia"}
          </p>
        </div>
      </div>
      
      <Progress value={percent} className="h-1.5 bg-surface/50" />
    </div>
  );
}

export function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">{title}</h3>
  );
}

export function MasteryCard({ percent, trend }: { percent?: number; trend?: number }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-surface/20 p-5 shadow-sm hover:border-primary/20 transition-colors h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Mapa de Domínio</h3>
        <Brain className="h-4 w-4 text-muted-foreground/40" />
      </div>
      {percent === undefined ? (
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground">Seu nível ainda está sendo construído.</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            O Dominus começará a identificar seus pontos fortes e lacunas conforme você estudar e responder questões.
          </p>
          <p className="pt-2 text-[10px] font-bold text-primary uppercase tracking-wider">Primeira sessão necessária</p>
        </div>
      ) : (
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-black tracking-tighter text-foreground">{percent}% <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Domínio</span></div>
            {trend && (
              <div className="mt-1 flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase tracking-tighter">
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
    <div className="rounded-2xl border border-border/50 bg-surface/20 p-6 shadow-sm">
      <div className="space-y-4">
        <div className="space-y-1">
          <h4 className="text-lg font-bold text-foreground">{title}</h4>
          <p className="text-sm text-muted-foreground max-w-md">{description}</p>
        </div>
        <Button asChild variant="secondary" size="sm" className="rounded-full">
          <Link to={to} params={params}>{ctaText} <ChevronRight className="ml-1.5 h-3.5 w-3.5" /></Link>
        </Button>
      </div>
    </div>
  );
}
