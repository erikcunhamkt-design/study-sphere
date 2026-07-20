import { useEffect, useId, useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { studyAreaSchema } from "../schemas";
import type { StudyArea, StudyAreaColor, StudyAreaIconName } from "../types";
import { useCreateStudyArea, useUpdateStudyArea } from "../hooks/use-study-areas";
import { ColorField, IconField } from "./color-icon-fields";

interface StudyAreaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area?: StudyArea;
  onCreated?: (area: StudyArea) => void;
}

const DEFAULT_FORM = {
  name: "",
  description: "",
  color: "magenta" as StudyAreaColor,
  icon: "BookOpen" as StudyAreaIconName,
};

export function StudyAreaFormDialog({
  open,
  onOpenChange,
  area,
  onCreated,
}: StudyAreaFormDialogProps) {
  const isEditing = !!area;
  const nameId = useId();
  const descId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submittingRef = useRef(false);

  const createArea = useCreateStudyArea();
  const updateArea = useUpdateStudyArea();
  const isPending = createArea.isPending || updateArea.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(
      area
        ? {
            name: area.name,
            description: area.description ?? "",
            color: (area.color as StudyAreaColor) ?? "magenta",
            icon: (area.icon as StudyAreaIconName) ?? "BookOpen",
          }
        : DEFAULT_FORM,
    );
    setErrors({});
    const id = window.setTimeout(() => nameRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, area]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;

    const parsed = studyAreaSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) nextErrors[String(issue.path[0])] = issue.message;
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    submittingRef.current = true;
    try {
      if (isEditing && area) {
        await updateArea.mutateAsync({
          id: area.id,
          patch: {
            name: parsed.data.name,
            description: parsed.data.description || null,
            color: parsed.data.color,
            icon: parsed.data.icon,
          },
        });
        toast.success("Área atualizada");
      } else {
        const created = await createArea.mutateAsync({
          name: parsed.data.name,
          description: parsed.data.description || null,
          color: parsed.data.color,
          icon: parsed.data.icon,
        });
        toast.success("Área criada");
        onCreated?.(created);
      }
      onOpenChange(false);
    } catch (err) {
      console.error("[studyAreaForm]", err);
      toast.error(
        isEditing ? "Não foi possível atualizar a área" : "Não foi possível criar a área",
      );
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar área" : "Nova área"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize o nome, a descrição, a cor ou o ícone desta área."
              : "Dê um nome para reunir cursos e conteúdos relacionados."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={nameId}>Nome</Label>
            <Input
              id={nameId}
              ref={nameRef}
              value={form.name}
              maxLength={120}
              placeholder="Ex.: Marketing, História, Programação"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? `${nameId}-err` : undefined}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            {errors.name ? (
              <p id={`${nameId}-err`} className="text-xs text-destructive" role="alert">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor={descId}>Descrição (opcional)</Label>
            <Textarea
              id={descId}
              value={form.description}
              maxLength={1000}
              rows={2}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? `${descId}-err` : undefined}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            {errors.description ? (
              <p id={`${descId}-err`} className="text-xs text-destructive" role="alert">
                {errors.description}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <ColorField
              value={form.color}
              onChange={(color) => setForm((f) => ({ ...f, color }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <IconField value={form.icon} onChange={(icon) => setForm((f) => ({ ...f, icon }))} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : isEditing ? (
                "Salvar alterações"
              ) : (
                "Criar área"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
