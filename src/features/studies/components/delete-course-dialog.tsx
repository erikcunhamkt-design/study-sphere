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
import type { Course } from "../types";
import { useDeleteCourse } from "../hooks/use-courses";

interface DeleteCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | null;
  moduleCount: number;
  lessonCount: number;
  onDeleted?: () => void;
}

export function DeleteCourseDialog({
  open,
  onOpenChange,
  course,
  moduleCount,
  lessonCount,
  onDeleted,
}: DeleteCourseDialogProps) {
  const deleteCourse = useDeleteCourse(course?.study_area_id);

  if (!course) return null;

  async function handleConfirm() {
    if (!course) return;
    try {
      await deleteCourse.mutateAsync(course.id);
      toast.success("Curso excluído");
      onDeleted?.();
    } catch (err) {
      console.error("[deleteCourse]", err);
      toast.error("Não foi possível excluir o curso");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !deleteCourse.isPending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir "{course.name}" permanentemente?</AlertDialogTitle>
          <AlertDialogDescription>
            {moduleCount > 0
              ? `Esta ação excluirá permanentemente o curso, ${moduleCount === 1 ? "1 módulo" : `${moduleCount} módulos`} e ${lessonCount === 1 ? "1 aula" : `${lessonCount} aulas`} vinculadas. Essa ação não pode ser desfeita.`
              : "Essa ação não pode ser desfeita."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }))}
            disabled={deleteCourse.isPending}
            onClick={handleConfirm}
          >
            Excluir permanentemente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
