import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Calendar, Clock, BarChart3, Brain, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecallResult } from "@/features/study-sessions/types";
import { HUMAN_STATES, type MemoryHumanState, mapToHumanState } from "../utils/memory-interpretation";

interface ConceptDetailDialogProps {
  concept: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConceptDetailDialog({ concept, open, onOpenChange }: ConceptDetailDialogProps) {
  if (!concept) return null;

  const humanState = concept.humanState || (concept.memory ? mapToHumanState({
    reps: concept.memory.reps || 0,
    stability: concept.memory.stability || 0,
    difficulty: concept.memory.difficulty || 0,
    lastResult: concept.memory.last_result as any,
    lapses: concept.memory.lapses || 0,
    isDue: concept.memory.due ? new Date(concept.memory.due) <= new Date() : false
  }) : HUMAN_STATES.novo);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border/10 rounded-[2.5rem] max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="secondary" className={cn("text-[8px] font-bold uppercase tracking-widest rounded-full border-none px-2", humanState.color)}>
              {humanState.label}
            </Badge>
            {concept.hasMismatch && (
              <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest border-orange-500/20 text-orange-500 bg-orange-500/5 px-2">
                Conflito Metacognitivo
              </Badge>
            )}
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight text-foreground leading-tight">
            {concept.concept?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 pt-4">
          {/* Por que está aqui? Regra 17 */}
          <div className="p-4 rounded-[1.5rem] bg-surface/50 border border-border/5 space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Por que este estado?</h4>
            <p className="text-sm text-foreground/80 leading-relaxed font-medium">
              {humanState.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground/40 mb-1">
                <Calendar className="w-3 h-3" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Última Recuperação</span>
              </div>
              <p className="text-sm font-bold text-foreground">
                {concept.last_recalled_at ? new Date(concept.last_recalled_at).toLocaleDateString() : "Nunca"}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground/40 mb-1">
                <Clock className="w-3 h-3" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Próxima Previsão</span>
              </div>
              <p className="text-sm font-bold text-foreground">
                {concept.due ? new Date(concept.due).toLocaleDateString() : "Não agendada"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2">
              <BarChart3 className="w-3 h-3" /> Evidências Acumuladas
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-surface/30 border border-border/5 text-center">
                <p className="text-lg font-black text-foreground">{concept.reps || 0}</p>
                <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40">Tentativas</p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                <p className="text-lg font-black text-emerald-500">{concept.successful_recalls || 0}</p>
                <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-500/40">Sucessos</p>
              </div>
              <div className="p-3 rounded-2xl bg-red-500/5 border border-red-500/10 text-center">
                <p className="text-lg font-black text-red-500">{concept.lapses || 0}</p>
                <p className="text-[8px] font-bold uppercase tracking-widest text-red-500/40">Falhas</p>
              </div>
            </div>
          </div>

          {concept.hasMismatch && (
            <div className="p-4 rounded-[1.5rem] bg-orange-500/5 border border-orange-500/10 flex gap-4 items-start">
              <Brain className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-orange-500 uppercase tracking-widest">Atenção Cognitiva</h5>
                <p className="text-xs text-orange-500/80 leading-relaxed">
                  Sua confiança está acima da sua recuperação recente. Vale testar este conceito novamente para calibrar sua percepção.
                </p>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button asChild className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-[10px]">
              <Link to="/app/revisar">
                Iniciar recuperação agora <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
