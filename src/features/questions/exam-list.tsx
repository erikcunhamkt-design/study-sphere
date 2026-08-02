import { useState } from "react";
import { Archive, ArchiveRestore, ListPlus, Pencil, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExamFormDialog } from "./exam-form-dialog";
import { ExamComposer } from "./exam-composer";
import { useDeleteExam, useSetExamArchived } from "./hooks";
import type { ExamRow } from "./types";

interface ExamListProps {
  exams: ExamRow[];
  onStart: (exam: ExamRow) => void;
  startDisabled?: boolean;
}

export function ExamList({ exams, onStart, startDisabled }: ExamListProps) {
  const [editing, setEditing] = useState<ExamRow | null>(null);
  const [composing, setComposing] = useState<ExamRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ExamRow | null>(null);

  const sorted = [...exams].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="space-y-2">
      {sorted.map((exam) => (
        <ExamRowItem
          key={exam.id}
          exam={exam}
          onEdit={() => setEditing(exam)}
          onCompose={() => setComposing(exam)}
          onStart={() => onStart(exam)}
          onDelete={() => setPendingDelete(exam)}
          startDisabled={startDisabled}
        />
      ))}

      <ExamFormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        exam={editing ?? undefined}
      />

      <ExamComposer exam={composing} onOpenChange={(open) => !open && setComposing(null)} />

      <DeleteExamDialog
        exam={pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      />
    </div>
  );
}

function ExamRowItem({
  exam,
  onEdit,
  onCompose,
  onStart,
  onDelete,
  startDisabled,
}: {
  exam: ExamRow;
  onEdit: () => void;
  onCompose: () => void;
  onStart: () => void;
  onDelete: () => void;
  startDisabled?: boolean;
}) {
  const setArchived = useSetExamArchived(exam.id);

  async function handleToggleArchive() {
    try {
      await setArchived.mutateAsync(!exam.is_archived);
      toast.success(exam.is_archived ? "Simulado reativado" : "Simulado arquivado");
    } catch (err) {
      console.error("[questions] falha ao arquivar/reativar simulado", err);
      toast.error("Não foi possível atualizar o simulado");
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{exam.title}</p>
          {exam.time_limit_minutes ? (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {exam.time_limit_minutes} min
            </Badge>
          ) : null}
          {exam.is_archived ? (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              Arquivado
            </Badge>
          ) : null}
        </div>
        {exam.description ? (
          <p className="truncate text-xs text-muted-foreground">{exam.description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onStart}
          disabled={startDisabled || exam.is_archived}
        >
          <Play className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Iniciar
        </Button>
        <Button variant="ghost" size="icon" aria-label="Compor simulado" onClick={onCompose}>
          <ListPlus className="h-4 w-4" aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Editar simulado" onClick={onEdit}>
          <Pencil className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={exam.is_archived ? "Reativar simulado" : "Arquivar simulado"}
          onClick={() => void handleToggleArchive()}
          disabled={setArchived.isPending}
        >
          {exam.is_archived ? (
            <ArchiveRestore className="h-4 w-4" aria-hidden />
          ) : (
            <Archive className="h-4 w-4" aria-hidden />
          )}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Excluir simulado" onClick={onDelete}>
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function DeleteExamDialog({
  exam,
  onOpenChange,
}: {
  exam: ExamRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const deleteExam = useDeleteExam();

  async function handleConfirm() {
    if (!exam) return;
    try {
      await deleteExam.mutateAsync(exam.id);
      toast.success("Simulado excluído");
      onOpenChange(false);
    } catch (err) {
      console.error("[questions] falha ao excluir simulado", err);
      toast.error("Não foi possível excluir o simulado");
    }
  }

  return (
    <AlertDialog open={!!exam} onOpenChange={(next) => !deleteExam.isPending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir este simulado permanentemente?</AlertDialogTitle>
          <AlertDialogDescription>
            As questões do seu banco não são apagadas. O histórico de tentativas deste simulado
            permanece registrado, apenas desvinculado. Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }))}
            disabled={deleteExam.isPending}
            onClick={() => void handleConfirm()}
          >
            Excluir permanentemente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
