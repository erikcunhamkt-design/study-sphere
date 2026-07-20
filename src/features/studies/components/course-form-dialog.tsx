import { useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { courseSchema } from "../schemas";
import type { Course, CourseStatus } from "../types";
import { useStudyAreas } from "../hooks/use-study-areas";
import { useCreateCourse, useUpdateCourse } from "../hooks/use-courses";
import { COURSE_STATUS_LABELS } from "../utils";

interface CourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando informado, o campo de área fica fixo (herdado da rota atual). */
  fixedAreaId?: string;
  /** Quando informado (e sem fixedAreaId), pré-seleciona a área no seletor, que continua editável. */
  defaultAreaId?: string;
  course?: Course;
  onCreated?: (course: Course) => void;
}

const DEFAULT_FORM = {
  study_area_id: "",
  name: "",
  description: "",
  status: "not_started" as CourseStatus,
};

export function CourseFormDialog({
  open,
  onOpenChange,
  fixedAreaId,
  defaultAreaId,
  course,
  onCreated,
}: CourseFormDialogProps) {
  const isEditing = !!course;
  const nameId = useId();
  const descId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submittingRef = useRef(false);

  const { data: areas } = useStudyAreas();
  const activeAreas = (areas ?? []).filter((a) => !a.is_archived);

  const areaIdForMutation = isEditing ? course!.study_area_id : fixedAreaId || form.study_area_id;
  const createCourse = useCreateCourse(areaIdForMutation);
  const updateCourse = useUpdateCourse(areaIdForMutation);
  const isPending = createCourse.isPending || updateCourse.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(
      course
        ? {
            study_area_id: course.study_area_id,
            name: course.name,
            description: course.description ?? "",
            status: course.status,
          }
        : { ...DEFAULT_FORM, study_area_id: fixedAreaId ?? defaultAreaId ?? "" },
    );
    setErrors({});
    const id = window.setTimeout(() => nameRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, course, fixedAreaId, defaultAreaId]);

  const noAreasAvailable = !isEditing && !fixedAreaId && activeAreas.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current || noAreasAvailable) return;

    const parsed = courseSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) nextErrors[String(issue.path[0])] = issue.message;
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    submittingRef.current = true;
    try {
      if (isEditing && course) {
        await updateCourse.mutateAsync({
          id: course.id,
          patch: {
            name: parsed.data.name,
            description: parsed.data.description || null,
            status: parsed.data.status,
          },
        });
        toast.success("Curso atualizado");
      } else {
        const created = await createCourse.mutateAsync({
          study_area_id: parsed.data.study_area_id,
          name: parsed.data.name,
          description: parsed.data.description || null,
          status: parsed.data.status,
        });
        toast.success("Curso criado");
        onCreated?.(created);
      }
      onOpenChange(false);
    } catch (err) {
      console.error("[courseForm]", err);
      toast.error(
        isEditing ? "Não foi possível atualizar o curso" : "Não foi possível criar o curso",
      );
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar curso" : "Novo curso"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize o nome, a descrição ou o status deste curso."
              : "Uma formação, disciplina, livro ou trilha dentro da área."}
          </DialogDescription>
        </DialogHeader>

        {noAreasAvailable ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você ainda não tem nenhuma área de conhecimento. Crie uma área primeiro para poder
              cadastrar um curso dentro dela.
            </p>
            <DialogFooter>
              <Button asChild>
                <Link to="/app/estudos">Ir para Estudos</Link>
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isEditing && !fixedAreaId ? (
              <div className="space-y-2">
                <Label htmlFor="course-area">Área</Label>
                <Select
                  value={form.study_area_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, study_area_id: v }))}
                >
                  <SelectTrigger id="course-area" aria-invalid={!!errors.study_area_id}>
                    <SelectValue placeholder="Selecione uma área" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAreas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.study_area_id ? (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.study_area_id}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor={nameId}>Nome</Label>
              <Input
                id={nameId}
                ref={nameRef}
                value={form.name}
                maxLength={120}
                placeholder="Ex.: Formação em Tráfego Pago"
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
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-status">Status inicial</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as CourseStatus }))}
              >
                <SelectTrigger id="course-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(COURSE_STATUS_LABELS) as CourseStatus[]).map((status) => (
                    <SelectItem key={status} value={status}>
                      {COURSE_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : isEditing ? (
                  "Salvar alterações"
                ) : (
                  "Criar curso"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
