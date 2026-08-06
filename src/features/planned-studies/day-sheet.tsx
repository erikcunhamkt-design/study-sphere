import { useState } from "react";
import { CalendarClock, Pencil, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PlannedStudyRow } from "./types";
import { useDeletePlannedStudy, useSetPlannedStudyStatus } from "./hooks";
import { PlannedStudyFormDialog } from "./planned-study-form-dialog";

interface DaySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** YYYY-MM-DD do dia selecionado (também vira default do formulário). */
  date: string;
  /** Rótulo legível do dia, ex.: "6 de agosto de 2026". */
  dateLabel: string;
  items: PlannedStudyRow[];
}

const STATUS_LABEL: Record<string, string> = {
  planned: "Planejado",
  completed: "Concluído",
  skipped: "Pulado",
};

export function DaySheet({ open, onOpenChange, date, dateLabel, items }: DaySheetProps) {
  const navigate = useNavigate();
  const deleteMut = useDeletePlannedStudy();
  const statusMut = useSetPlannedStudyStatus();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlannedStudyRow | undefined>(undefined);

  function openNew() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(item: PlannedStudyRow) {
    setEditing(item);
    setFormOpen(true);
  }

  function handleDelete(id: string) {
    deleteMut.mutate(id, {
      onSuccess: () => toast.success("Removido"),
      onError: () => toast.error("Não foi possível remover"),
    });
  }

  function handleStart() {
    // Decisão do Gate 1/2: a agenda NÃO cria sessão. Apenas navega para a
    // tela de métodos de estudo (Fase 05.2), que cria e fecha a sessão real.
    void navigate({ to: "/app/estudar" });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{dateLabel}</SheetTitle>
            <SheetDescription>
              {items.length === 0
                ? "Nenhum estudo planejado para este dia."
                : `${items.length} estudo(s) planejado(s).`}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            <Button onClick={openNew} className="w-full">
              Novo estudo planejado
            </Button>

            {items.map((item) => (
              <div key={item.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium leading-snug">{item.title}</p>
                  <Badge variant={item.status === "completed" ? "default" : "secondary"}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </Badge>
                </div>

                {item.estimated_minutes != null ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                    {item.estimated_minutes} min estimados
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2 pt-1">
                  {item.status === "planned" ? (
                    <Button size="sm" variant="secondary" onClick={handleStart}>
                      <Play className="h-3.5 w-3.5" aria-hidden />
                      Estudar
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Editar
                  </Button>
                  {item.status === "planned" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => statusMut.mutate({ id: item.id, status: "skipped" })}
                    >
                      Pular
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => statusMut.mutate({ id: item.id, status: "planned" })}
                    >
                      Reabrir
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <PlannedStudyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultDate={date}
        plannedStudy={editing}
      />
    </>
  );
}
