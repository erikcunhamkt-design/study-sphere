import { BookOpen, Brain, ChevronRight, Clock, Layers, ListChecks, Play, Sparkles, Target } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function NextStepAction({
  title,
  subtitle,
  description,
  ctaText,
  to,
  search,
  params,
  icon: Icon = Sparkles,
}: {
  title: string;
  subtitle?: string;
  description: string;
  ctaText: string;
  to: string;
  search?: any;
  params?: any;
  icon?: React.ElementType;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/10 via-surface/40 to-surface/80 p-6 md:p-8 shadow-sm transition-all hover:shadow-md">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="relative space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20">
          <Icon className="h-3.5 w-3.5" />
          {title}
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{subtitle}</h2>
          <p className="mt-2 text-base text-muted-foreground max-w-md">{description}</p>
        </div>
        <Button asChild size="lg" className="rounded-full px-8">
          <Link to={to} search={search} params={params}>
            {ctaText} <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function MiniStatCard({ title, value, unit, description }: { title: string; value: string | number; unit?: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-surface/40 p-5 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

