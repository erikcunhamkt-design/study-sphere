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
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/10 via-surface/40 to-surface/80 p-6 md:p-8 shadow-sm transition-all hover:shadow-md">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="relative space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20">
          <Icon className="h-3.5 w-3.5" />
          {title}
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{subtitle}</h2>
          <p className="text-base text-muted-foreground max-w-lg leading-relaxed">{description}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
          <Button asChild size="lg" className="rounded-full px-8 font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
            <Link to={to} search={search} params={params}>
              {ctaText} <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          {estimatedMinutes && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium bg-surface/50 px-4 py-2 rounded-full border border-border/50">
              <Clock className="h-3.5 w-3.5" />
              <span>{estimatedMinutes} min estimados</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DayProgress({ current, goal, reviews }: { current: number; goal: number; reviews: number }) {
  const percent = Math.min(Math.round((current / goal) * 100), 100);
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Seu Dia</h3>
        <div className="flex items-center gap-3 text-sm font-medium">
          <span className="text-foreground">{current} min estudados</span>
          <span className="text-muted-foreground/30">•</span>
          <span className="text-foreground">{reviews} revisões</span>
          <span className="text-muted-foreground/30">•</span>
          <span className="text-muted-foreground">{goal} min meta</span>
        </div>
      </div>
      
      <div className="relative">
        <Progress value={percent} className="h-2.5 bg-surface/50 border border-border/20" />
        <div className="absolute top-full mt-2 left-0 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
          {percent}% concluído
        </div>
      </div>
    </div>
  );
}

export function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">{title}</h3>
  );
}

export function MasteryCard({ percent, trend }: { percent?: number; trend?: number }) {
  return (
    <div className="rounded-3xl border border-border/50 bg-surface/40 p-6 shadow-sm hover:border-primary/20 transition-colors">
      <SectionHeader title="Seu Domínio" />
      {percent === undefined ? (
        <div className="space-y-2">
          <p className="text-base font-semibold text-foreground">Estamos começando a conhecer seu nível.</p>
          <p className="text-sm text-muted-foreground max-w-sm">Complete sua primeira sessão para começar a construir seu mapa de conhecimento.</p>
        </div>
      ) : (
        <div className="flex items-end justify-between">
          <div>
            <div className="text-4xl font-black tracking-tighter text-foreground">{percent}% <span className="text-lg font-medium text-muted-foreground">de domínio</span></div>
            {trend && (
              <div className="mt-1 flex items-center gap-1 text-sm font-bold text-emerald-500">
                <span>↑ {trend}%</span>
                <span className="text-muted-foreground font-normal ml-1">esta semana</span>
              </div>
            )}
          </div>
          <Brain className="h-10 w-10 text-primary/20" />
        </div>
      )}
    </div>
  );
}

export function SimpleEmptyState({ title, description, ctaText, to, params }: { title: string; description: string; ctaText: string; to: string; params?: any }) {
  return (
    <div className="rounded-3xl border border-border/50 bg-surface/40 p-6 shadow-sm">
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
