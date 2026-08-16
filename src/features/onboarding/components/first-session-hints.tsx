import { Lightbulb, PenLine } from "lucide-react";

/** Micro-orientação exibida apenas na primeira sessão de aprendizagem. */
export function FirstStepHint() {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
      <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Seu primeiro passo</p>
        <p className="text-sm text-muted-foreground font-medium leading-relaxed">
          Leia e compreenda o material. Não tente decorar tudo agora.
        </p>
      </div>
    </div>
  );
}

/** Convite suave às anotações — nunca obrigatório. */
export function FirstNotesHint() {
  return (
    <div className="rounded-2xl border border-border/30 bg-surface/30 p-4 flex items-start gap-3">
      <PenLine className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Anotações</p>
        <p className="text-sm text-muted-foreground font-medium leading-relaxed">
          Registre relações, dúvidas ou ideias importantes.
        </p>
      </div>
    </div>
  );
}
