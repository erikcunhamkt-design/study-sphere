import { useState } from "react";
import { Archive, ArchiveRestore, Pencil, PlayCircle, Trash2 } from "lucide-react";
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
import { QuestionFormDialog } from "./question-form-dialog";
import { PracticeDialog } from "./practice-dialog";
import { useDeleteQuestion, useSetQuestionArchived } from "./hooks";
import type { QuestionRow } from "./types";

const TYPE_LABELS: Record<QuestionRow["type"], string> = {
  multipla_escolha: "Múltipla escolha",
  discursiva: "Discursiva",
};

interface QuestionListProps {
  questions: QuestionRow[];
}

export function QuestionList({ questions }: QuestionListProps) {
  const [editing, setEditing] = useState<QuestionRow | null>(null);
  const [practicing, setPracticing] = useState<QuestionRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<QuestionRow | null>(null);

  const sorted = [...questions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="space-y-2">
      {sorted.map((question) => (
        <QuestionRowItem
          key={question.id}
          question={question}
          onEdit={() => setEditing(question)}
          onPractice={() => setPracticing(question)}
          onDelete={() => setPendingDelete(question)}
        />
      ))}

      <QuestionFormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        question={editing ?? undefined}
      />

      <PracticeDialog question={practicing} onOpenChange={(open) => !open && setPracticing(null)} />

      <DeleteQuestionDialog
        question={pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      />
    </div>
  );
}

function QuestionRowItem({
  question,
  onEdit,
  onPractice,
  onDelete,
}: {
  question: QuestionRow;
  onEdit: () => void;
  onPractice: () => void;
  onDelete: () => void;
}) {
  const setArchived = useSetQuestionArchived(question.id);

  async function handleToggleArchive() {
    try {
      await setArchived.mutateAsync(!question.is_archived);
      toast.success(question.is_archived ? "Questão reativada" : "Questão arquivada");
    } catch (err) {
      console.error("[questions] falha ao arquivar/reativar", err);
      toast.error("Não foi possível atualizar a questão");
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{question.statement}</p>
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {TYPE_LABELS[question.type]}
          </Badge>
          {question.is_archived ? (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              Arquivada
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Praticar questão" onClick={onPractice}>
          <PlayCircle className="h-4 w-4" aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Editar questão" onClick={onEdit}>
          <Pencil className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={question.is_archived ? "Reativar questão" : "Arquivar questão"}
          onClick={() => void handleToggleArchive()}
          disabled={setArchived.isPending}
        >
          {question.is_archived ? (
            <ArchiveRestore className="h-4 w-4" aria-hidden />
          ) : (
            <Archive className="h-4 w-4" aria-hidden />
          )}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Excluir questão" onClick={onDelete}>
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function DeleteQuestionDialog({
  question,
  onOpenChange,
}: {
  question: QuestionRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const deleteQuestion = useDeleteQuestion();

  async function handleConfirm() {
    if (!question) return;
    try {
      await deleteQuestion.mutateAsync(question.id);
      toast.success("Questão excluída");
      onOpenChange(false);
    } catch (err) {
      console.error("[questions] falha ao excluir", err);
      toast.error("Não foi possível excluir a questão");
    }
  }

  return (
    <AlertDialog
      open={!!question}
      onOpenChange={(next) => !deleteQuestion.isPending && onOpenChange(next)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir esta questão permanentemente?</AlertDialogTitle>
          <AlertDialogDescription>
            Ela também será removida de qualquer simulado que a use, e o histórico de respostas
            associado a ela será apagado. Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }))}
            disabled={deleteQuestion.isPending}
            onClick={() => void handleConfirm()}
          >
            Excluir permanentemente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
