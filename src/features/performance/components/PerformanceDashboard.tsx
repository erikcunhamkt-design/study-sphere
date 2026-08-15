import { Brain, Clock, Target, Activity, ArrowRight, LineChart, AlertCircle, TrendingUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { usePerformanceDashboard } from "../hooks/use-performance-dashboard";
import { cn } from "@/lib/utils";

export function PerformanceDashboard() {
  const { data, isLoading } = usePerformanceDashboard();

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Regra 6: Estado de Usuário Novo
  if (!data?.hasData) {
    return (
      <div className="py-20 text-center space-y-8 animate-in fade-in duration-700">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
          <TrendingUp className="w-8 h-8" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">Seu mapa está começando</h2>
          <p className="text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed">
            Estude e recupere conceitos para começar a construir seu histórico de aprendizagem.
          </p>
        </div>
        <Button asChild className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/10">
          <Link to="/app/biblioteca" search={{ tab: 'materials' }}>Começar estudo <ArrowRight className="ml-2 w-4 h-4" /></Link>
        </Button>
      </div>
    );
  }

  // Regra 7: Estudou mas sem avaliação
  if (!data.hasEvaluations) {
    return (
      <div className="py-20 text-center space-y-8 animate-in fade-in duration-700">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
          <Activity className="w-8 h-8" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">Você já estudou. Agora precisamos testar o que ficou.</h2>
          <p className="text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed">
            O Dominus ainda não possui evidências suficientes para avaliar sua memória.
          </p>
        </div>
        <Button asChild className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/10">
          <Link to="/app/revisar">Testar memória <ArrowRight className="ml-2 w-4 h-4" /></Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-500">
      {/* Resumo Regra 5 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Conceitos Estudados", value: data.summary.totalConcepts, color: "text-foreground" },
          { label: "Memórias Avaliadas", value: data.summary.evaluatedMemories, color: "text-primary" },
          { label: "Revisões Devidas", value: data.summary.dueReviews, color: "text-orange-500" },
          { label: "Revisões em Dia", value: data.summary.inDayReviews, color: "text-emerald-500" },
        ].map((stat, i) => (
          <Card key={i} className="bg-surface/30 border-border/10 rounded-[2rem]">
            <CardContent className="pt-6">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">{stat.label}</span>
              <p className={cn("text-3xl font-black mt-1", stat.color)}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Regra 11: Merece Atenção */}
      {data.attentionNeeded.length > 0 && (
        <section className="space-y-6">
          <header className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-orange-500/80">Merece sua atenção</h3>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.attentionNeeded.map((concept) => (
              <Card key={concept.id} className="bg-surface/40 border-orange-500/20 rounded-[2.5rem] relative overflow-hidden group">
                <CardContent className="pt-8 space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-xl font-black text-foreground">{concept.concept?.title}</h4>
                    <p className="text-xs text-muted-foreground/60 leading-relaxed">
                      {concept.hasMismatch 
                        ? "Sua confiança esteve acima da sua recuperação recente."
                        : concept.humanState.description}
                    </p>
                  </div>
                  <Button asChild variant="outline" className="h-9 px-6 rounded-full border-orange-500/20 text-orange-500 hover:bg-orange-500/10 text-[9px] font-bold uppercase tracking-widest">
                    <Link to="/app/revisar">Revisar agora</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Regra 8 e 9: Seus Conceitos */}
      <section className="space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Seus Conceitos</h3>
          </div>
        </header>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {data.concepts.map((ms) => (
            <Card key={ms.id} className="bg-surface/20 border-border/10 rounded-[2rem] hover:bg-surface/30 transition-colors group cursor-pointer">
              <CardContent className="pt-6 space-y-3">
                <h4 className="text-sm font-bold text-foreground truncate">{ms.concept?.title}</h4>
                <div className="space-y-2">
                  <Badge variant="secondary" className={cn("text-[8px] font-bold uppercase tracking-widest rounded-full border-none px-2", ms.humanState.color)}>
                    {ms.humanState.label}
                  </Badge>
                  {ms.isDue && (
                    <div className="flex items-center gap-1.5 text-orange-500">
                      <Clock className="w-2.5 h-2.5" />
                      <span className="text-[8px] font-bold uppercase tracking-widest">Devido</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Regra 13 e 14: Revisões e Estudo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-surface/40 border-border/10 rounded-[2.5rem]">
          <CardHeader>
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2">
              <Clock className="w-3 h-3" /> Próximas Revisões
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            {[
              { label: "Hoje", value: data.futureReviews.today },
              { label: "Amanhã", value: data.futureReviews.tomorrow },
              { label: "Próximos 7 dias", value: data.futureReviews.next7Days },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border/5 pb-4 last:border-0 last:pb-0">
                <span className="text-sm font-medium text-foreground/60">{r.label}</span>
                <span className="text-lg font-black text-foreground">{r.value} <span className="text-[10px] text-muted-foreground/40 font-bold ml-1">conceitos</span></span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-surface/40 border-border/10 rounded-[2.5rem]">
          <CardHeader>
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2">
              <Activity className="w-3 h-3" /> Seu Estudo
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-8 pt-2">
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Tempo estudado</span>
              <p className="text-2xl font-black text-foreground">{data.studyProgress.totalTimeMinutes} <span className="text-[10px] text-muted-foreground/40">min</span></p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Sessões</span>
              <p className="text-2xl font-black text-foreground">{data.studyProgress.completedSessions}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Iniciados</span>
              <p className="text-2xl font-black text-foreground">{data.studyProgress.startedConcepts}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Consolidados</span>
              <p className="text-2xl font-black text-foreground">{data.studyProgress.completedConcepts}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regra 16: Histórico */}
      <section className="space-y-6">
        <header className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-muted-foreground/40" />
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Últimas Recuperações</h3>
        </header>
        <div className="space-y-3">
          {data.evidences.map((ev) => (
            <div key={ev.id} className="flex items-center justify-between p-4 rounded-[1.5rem] bg-surface/20 border border-border/5">
              <div className="flex items-center gap-4">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", 
                  ev.result === 'correct' || ev.result === 'self_reported_correct' ? "bg-emerald-500/10 text-emerald-500" :
                  ev.result === 'partial' || ev.result === 'self_reported_partial' ? "bg-orange-500/10 text-orange-500" :
                  "bg-red-500/10 text-red-500"
                )}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{(ev as any).concept?.title}</p>
                  <p className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-widest">
                    {new Date(ev.attempted_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={cn("text-[8px] font-bold uppercase tracking-widest border-none px-2", 
                ev.result === 'correct' || ev.result === 'self_reported_correct' ? "text-emerald-500 bg-emerald-500/5" :
                ev.result === 'partial' || ev.result === 'self_reported_partial' ? "text-orange-500 bg-orange-500/5" :
                "text-red-500 bg-red-500/5"
              )}>
                {ev.result === 'correct' || ev.result === 'self_reported_correct' ? "Boa" :
                 ev.result === 'partial' || ev.result === 'self_reported_partial' ? "Parcial" : "Ruim"}
              </Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
