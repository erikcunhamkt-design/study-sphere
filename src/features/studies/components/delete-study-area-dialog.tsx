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
import type { StudyArea } from "../types";
import { useDeleteStudyArea } from "../hooks/use-study-areas";
import { canConfirmAreaDeletion } from "../utils";

interface DeleteStudyAreaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area: StudyArea | null;
  courseCount: number;
  onDeleted?: () => void;
}

export function DeleteStudyAreaDialog({
  open,
  onOpenChange,
  area,
  courseCount,
  onDeleted,
}: DeleteStudyAreaDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const deleteArea = useDeleteStudyArea();
  const requiresTyping = courseCount > 0;

  useEffect(() => {
    if (open) setConfirmText("");
  }, [open]);

  if (!area) return null;

  const canConfirm = canConfirmAreaDeletion(area.name, courseCount, confirmText);

  async function handleConfirm() {
    if (!area || !canConfirm) return;
    try {
      await deleteArea.mutateAsync(area.id);
      toast.success("Área excluída");
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      console.error("[deleteStudyArea]", err);
      toast.error("Não foi possível excluir a área");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !deleteArea.isPending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir "{area.name}" permanentemente?</AlertDialogTitle>
          <AlertDialogDescription>
            {courseCount > 0
              ? `Esta ação excluirá permanentemente a área e ${courseCount === 1 ? "o curso" : `os ${courseCount} cursos`} vinculados. Essa ação não pode ser desfeita.`
              : "Esta ação não pode ser desfeita."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {requiresTyping ? (
          <div className="space-y-2">
            <Label htmlFor="confirm-area-name">
              Digite <span className="font-medium text-foreground">{area.name}</span> para confirmar
            </Label>
            <Input
              id="confirm-area-name"
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
            disabled={!canConfirm || deleteArea.isPending}
            onClick={handleConfirm}
          >
            Excluir permanentemente
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
