import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ReorderButtonsProps {
  label: string;
  disabledUp: boolean;
  disabledDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

/**
 * Alternativa por teclado ao invés de drag-and-drop: dois botões com
 * `aria-label` explícito. Evita depender de eventos de arrastar (pointer
 * gestures), que exigem tratamento extra de acessibilidade e não têm
 * suporte nativo por teclado — estes botões funcionam com Tab + Enter/
 * Espaço em qualquer navegador ou leitor de tela sem código adicional.
 */
export function ReorderButtons({
  label,
  disabledUp,
  disabledDown,
  onMoveUp,
  onMoveDown,
}: ReorderButtonsProps) {
  return (
    <div className="flex flex-col">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        disabled={disabledUp}
        onClick={onMoveUp}
        aria-label={`Mover ${label} para cima`}
      >
        <ChevronUp className="h-3.5 w-3.5" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        disabled={disabledDown}
        onClick={onMoveDown}
        aria-label={`Mover ${label} para baixo`}
      >
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </Button>
    </div>
  );
}

/** Calcula a nova ordem de IDs ao mover o item em `index` uma posição. */
export function moveId(ids: string[], index: number, direction: "up" | "down"): string[] {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}
