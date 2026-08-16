import { ArrowRight, CalendarClock, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatNextDue } from "../hooks";

interface FirstCycleCompleteProps {
  /** Data real calculada pelo motor de memória (pode não existir ainda). */
  nextDue?: string | null;
  onFinish: () => void;
}

/**
 * Fechamento do primeiro ciclo: explica o valor do que acabou de acontecer,
 * sem termos técnicos (nada de FSRS, estabilidade ou dificuldade).
 */
export function FirstCycleComplete({ nextDue, onFinish }: FirstCycleCompleteProps) {
  const when = formatNextDue(nextDue);

  return (
    <section
      aria-labelledby="primeiro-ciclo-titulo"
      className="max-w-xl mx-auto space-y-8 py-10 text-center"
    >
      <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
        <CheckCircle2 className="h-6 w-6" />
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40">
          Primeira evidência registrada
        </p>
        <h2 id="primeiro-ciclo-titulo" className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
          Você acabou de criar sua primeira memória.
        </h2>
        <p className="text-sm md:text-base text-muted-foreground font-medium leading-relaxed">
          Estudar cria contato. Tentar lembrar cria memória. A partir de agora o Dominus organiza
          suas revisões com base no que você conseguiu recuperar.
        </p>
      </div>

      <div className="rounded-2xl border border-border/40 bg-surface/30 p-5 flex items-start gap-3 text-left">
        <CalendarClock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
            Próxima recuperação prevista
          </p>
          <p className="text-sm text-foreground font-bold">
            {when
              ? `Este conteúdo volta para você ${when}.`
              : "Este conteúdo voltará quando o momento de recuperar for útil."}
          </p>
        </div>
      </div>

      <Button
        onClick={onFinish}
        className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-black"
      >
        Voltar para meu espaço <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </section>
  );
}
