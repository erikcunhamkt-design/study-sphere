import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CourseModule } from "../types";
import { useDeleteCourseModule } from "../hooks/use-course-modules";
import { canConfirmModuleDeletion } from "../utils";

interface DeleteModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseModule: CourseModule | null;
  lessonCount: number;
  onDeleted?: () => void;
}

export function DeleteModuleDialog({
  open,
  onOpenChange,
  courseModule,
  lessonCount,
  onDeleted,
}: DeleteModuleDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const deleteModule = useDeleteCourseModule(courseModule?.course_id);
  const requiresTyping = lessonCount > 0;

  useEffect(() => {
    if (open) setConfirmText("");
  }, [open]);

  if (!courseModule) return null;

  const canConfirm = canConfirmModuleDeletion(courseModule.name, lessonCount, confirmText);

  async function handleConfirm() {
    if (!courseModule || !canConfirm) return;
    try {
      await deleteModule.mutateAsync(courseModule.id);
      toast.success("Módulo excluído");
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      console.error("[deleteCourseModule]", err);
      toast.error("Não foi possível excluir o módulo");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !deleteModule.isPending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir "{courseModule.name}" permanentemente?</AlertDialogTitle>
          <AlertDialogDescription>
            {lessonCount > 0
              ? `Esta ação excluirá permanentemente o módulo e ${lessonCount === 1 ? "a aula" : `as ${lessonCount} aulas`} vinculadas. Essa ação não pode ser desfeita.`
              : "Esta ação não pode ser desfeita."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {requiresTyping ? (
          <div className="space-y-2">
            <Label htmlFor="confirm-module-name">
              Digite <span className="font-medium text-foreground">{courseModule.name}</span> para
              confirmar
            </Label>
            <Input
              id="confirm-module-name"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
            />
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!canConfirm || deleteModule.isPending}
            onClick={handleConfirm}
          >
            Excluir permanentemente
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
