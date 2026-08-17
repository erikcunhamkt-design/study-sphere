import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { AutosaveStatus } from "./use-autosave";

const STATUS_CONFIG: Record<AutosaveStatus, { label: string; dotClassName: string }> = {
  idle: { label: "", dotClassName: "" },
  editing: { label: "Editando", dotClassName: "bg-muted-foreground/50" },
  saving: { label: "Salvando…", dotClassName: "bg-primary" },
  saved: { label: "Salvo agora", dotClassName: "bg-emerald-500" },
  offline: { label: "Sem conexão — tentando de novo…", dotClassName: "bg-amber-500" },
  erro: { label: "Não foi possível salvar", dotClassName: "bg-destructive" },
  conflito: { label: "Conflito de versão", dotClassName: "bg-destructive" },
};

const TEXT_CLASSNAME: Partial<Record<AutosaveStatus, string>> = {
  offline: "text-amber-600 dark:text-amber-400",
  erro: "text-destructive",
  conflito: "text-destructive",
};

export function AutosaveStatusIndicator({
  status,
  onRetry,
}: {
  status: AutosaveStatus;
  /** Só usado quando status === "erro" — sem ela, o estado de erro fica sem CTA. */
  onRetry?: () => void;
}) {
  // Reforça a percepção de "acabou de salvar" com um pulso breve no ponto
  // — sem depender de setInterval nem de exibir hora relativa (o rótulo
  // continua estático como "Salvo agora" enquanto o status não mudar).
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    if (status !== "saved") return;
    setJustSaved(true);
    const timeout = setTimeout(() => setJustSaved(false), 1200);
    return () => clearTimeout(timeout);
  }, [status]);

  if (status === "idle") return null;
  const { label, dotClassName } = STATUS_CONFIG[status];
  const isSaving = status === "saving";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/40 bg-surface/40 px-3 py-1 text-xs font-medium text-muted-foreground",
        TEXT_CLASSNAME[status],
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full transition-transform duration-300",
          dotClassName,
          isSaving && "animate-pulse",
          justSaved && "scale-150",
        )}
        aria-hidden
      />
      {label}
      {status === "erro" && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="font-bold text-destructive underline underline-offset-2 hover:no-underline"
        >
          Tentar novamente
        </button>
      ) : null}
    </span>
  );
}
