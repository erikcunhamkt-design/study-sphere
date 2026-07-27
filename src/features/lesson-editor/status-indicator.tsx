import { AlertTriangle, Check, Cloud, CloudOff, Loader2, PenLine } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AutosaveStatus } from "./use-autosave";

const STATUS_CONFIG: Record<
  AutosaveStatus,
  { label: string; icon: typeof Check; className: string }
> = {
  idle: { label: "", icon: Check, className: "text-muted-foreground" },
  editing: { label: "Editando…", icon: PenLine, className: "text-muted-foreground" },
  saving: { label: "Salvando…", icon: Loader2, className: "text-muted-foreground" },
  saved: { label: "Salvo", icon: Check, className: "text-muted-foreground" },
  offline: { label: "Sem conexão — tentando de novo…", icon: CloudOff, className: "text-amber-600 dark:text-amber-400" },
  erro: { label: "Não foi possível salvar", icon: AlertTriangle, className: "text-destructive" },
  conflito: { label: "Conflito de versão", icon: Cloud, className: "text-destructive" },
};

export function AutosaveStatusIndicator({ status }: { status: AutosaveStatus }) {
  if (status === "idle") return null;
  const { label, icon: Icon, className } = STATUS_CONFIG[status];

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs", className)}
      role="status"
      aria-live="polite"
    >
      <Icon className={cn("h-3.5 w-3.5", status === "saving" && "animate-spin")} aria-hidden />
      {label}
    </span>
  );
}
