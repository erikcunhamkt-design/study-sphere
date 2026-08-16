import { Brain } from "lucide-react";

/** Micro-orientação exibida apenas na primeira tentativa de recuperação. */
export function FirstRecallHint() {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
      <Brain className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Testar memória</p>
        <p className="text-sm text-muted-foreground font-medium leading-relaxed">
          Tente responder sem consultar o material. Errar aqui também gera aprendizado.
        </p>
      </div>
    </div>
  );
}
