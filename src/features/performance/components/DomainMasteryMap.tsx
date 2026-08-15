import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Target, AlertCircle, ChevronRight, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDomainModel } from "../hooks/use-domain-model";
import { useState } from "react";
import { ConceptDetailDialog } from "./ConceptDetailDialog";

export function DomainMasteryMap() {
  const { data: domains, isLoading } = useDomainModel();
  const [selectedConcept, setSelectedConcept] = useState<any>(null);

  if (isLoading) return null;
  if (!domains || domains.length === 0) return null;

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" />
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Meus Domínios</h3>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {domains.map((domain) => (
          <Card 
            key={domain.id} 
            className="bg-surface/40 border-border/10 rounded-[2.5rem] overflow-hidden group hover:border-primary/20 transition-all"
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="text-xl font-black text-foreground">{domain.name}</h4>
                  <Badge 
                    variant="secondary" 
                    className={cn("text-[8px] font-bold uppercase tracking-widest rounded-full border-none px-2", domain.mastery.color)}
                  >
                    {domain.mastery.label}
                  </Badge>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-surface/50 border border-border/10 flex items-center justify-center text-muted-foreground/20 group-hover:text-primary/40 transition-colors">
                  <Brain className="w-5 h-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-xs text-muted-foreground/60 leading-relaxed font-medium">
                {domain.mastery.description}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/30">Cobertura</span>
                  <p className="text-sm font-black text-foreground">
                    {domain.metrics.evaluatedConcepts} / {domain.metrics.totalConcepts}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/30">Atenção</span>
                  <p className={cn("text-sm font-black", domain.metrics.attentionConcepts > 0 ? "text-orange-500" : "text-emerald-500")}>
                    {domain.metrics.attentionConcepts} conceitos
                  </p>
                </div>
              </div>

              {domain.metrics.dueConcepts > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/5 border border-orange-500/10 text-orange-500">
                  <AlertCircle className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">
                    {domain.metrics.dueConcepts} recuperações aguardando
                  </span>
                </div>
              )}

              <div className="pt-2">
                <div className="flex flex-wrap gap-2">
                  {domain.concepts.slice(0, 5).map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedConcept(c)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all hover:scale-150",
                        !c.memory || c.memory.reps === 0 ? "bg-muted/20" : 
                        c.memory.last_result === 'incorrect' ? "bg-red-500/40" :
                        "bg-primary/40"
                      )}
                      title={c.title}
                    />
                  ))}
                  {domain.concepts.length > 5 && (
                    <span className="text-[8px] font-bold text-muted-foreground/20 self-center">
                      +{domain.concepts.length - 5}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConceptDetailDialog 
        concept={selectedConcept}
        open={!!selectedConcept}
        onOpenChange={(open) => !open && setSelectedConcept(null)}
      />
    </section>
  );
}
