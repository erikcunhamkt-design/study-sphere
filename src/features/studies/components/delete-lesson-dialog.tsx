import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Lesson } from "../types";
import { useDeleteLesson } from "../hooks/use-lessons";

interface DeleteLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson | null;
  onDeleted?: () => void;
}

export function DeleteLessonDialog({
  open,
  onOpenChange,
  lesson,
  onDeleted,
}: DeleteLessonDialogProps) {
  const deleteLesson = useDeleteLesson(lesson?.module_id, lesson?.course_id);

  if (!lesson) return null;

  async function handleConfirm() {
    if (!lesson) return;
    try {
      await deleteLesson.mutateAsync(lesson.id);
      toast.success("Aula excluída");
      onDeleted?.();
    } catch (err) {
      console.error("[deleteLesson]", err);
      toast.error("Não foi possível excluir a aula");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !deleteLesson.isPending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir "{lesson.title}" permanentemente?</AlertDialogTitle>
          <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }))}
            disabled={deleteLesson.isPending}
            onClick={handleConfirm}
          >
            Excluir permanentemente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
