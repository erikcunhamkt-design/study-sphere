import { useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { examFormSchema } from "./schema";
import { useCreateExam, useUpdateExam } from "./hooks";
import type { ExamRow } from "./types";

interface ExamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam?: ExamRow;
}

export function ExamFormDialog({ open, onOpenChange, exam }: ExamFormDialogProps) {
  const isEditing = !!exam;
  const titleId = useId();
  const descriptionId = useId();
  const timeLimitId = useId();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createExam = useCreateExam();
  const updateExam = useUpdateExam(exam?.id ?? "");
  const isPending = createExam.isPending || updateExam.isPending;

  useEffect(() => {
    if (!open) return;
    if (exam) {
      setTitle(exam.title);
      setDescription(exam.description ?? "");
      setTimeLimitMinutes(exam.time_limit_minutes ? String(exam.time_limit_minutes) : "");
    } else {
      setTitle("");
      setDescription("");
      setTimeLimitMinutes("");
    }
    setError(null);
  }, [open, exam]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;

    const parsed = examFormSchema.safeParse({
      title,
      description: description.trim() === "" ? null : description,
      timeLimitMinutes: timeLimitMinutes.trim() === "" ? null : Number(timeLimitMinutes),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revise os campos do simulado.");
      return;
    }
    setError(null);

    try {
      if (isEditing && exam) {
        await updateExam.mutateAsync(parsed.data);
        toast.success("Simulado atualizado");
      } else {
        await createExam.mutateAsync(parsed.data);
        toast.success("Simulado criado");
      }
      onOpenChange(false);
    } catch (err) {
      console.error("[questions] falha ao salvar simulado", err);
      toast.error(
        isEditing ? "Não foi possível atualizar o simulado" : "Não foi possível criar o simulado",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar simulado" : "Novo simulado"}</DialogTitle>
          <DialogDescription>
            Depois de criar, adicione questões do seu banco na composição do simulado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={titleId}>Título</Label>
            <Input
              id={titleId}
              value={title}
              maxLength={200}
              placeholder="Ex.: Revisão — Direito Civil"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={descriptionId}>Descrição (opcional)</Label>
            <Textarea
              id={descriptionId}
              value={description}
              maxLength={2000}
              rows={2}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={timeLimitId}>Tempo consultivo em minutos (opcional)</Label>
            <Input
              id={timeLimitId}
              type="number"
              min={1}
              value={timeLimitMinutes}
              placeholder="Sem limite"
              onChange={(e) => setTimeLimitMinutes(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Só um cronômetro de referência durante a execução — não interrompe o simulado.
            </p>
          </div>

          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : isEditing ? (
                "Salvar alterações"
              ) : (
                "Criar simulado"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
