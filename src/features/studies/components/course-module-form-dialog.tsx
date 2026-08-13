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
import { courseModuleSchema } from "../schemas";
import type { CourseModule } from "../types";
import { useStudyAreas } from "../hooks/use-study-areas";
import { useCoursesByArea } from "../hooks/use-courses";
import { useCreateCourseModule, useUpdateCourseModule } from "../hooks/use-course-modules";

interface CourseModuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando informado, o campo de curso fica fixo (herdado da rota atual). */
  fixedCourseId?: string;
  courseModule?: CourseModule;
  onCreated?: (courseModule: CourseModule) => void;
}

const DEFAULT_FORM = { course_id: "", name: "", description: "" };

export function CourseModuleFormDialog({
  open,
  onOpenChange,
  fixedCourseId,
  courseModule,
  onCreated,
}: CourseModuleFormDialogProps) {
  const isEditing = !!courseModule;
  const nameId = useId();
  const descId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submittingRef = useRef(false);

  const { data: areas } = useStudyAreas();
  const activeAreas = (areas ?? []).filter((a) => !a.is_archived);
  const { data: coursesInArea } = useCoursesByArea(selectedAreaId || undefined);
  const activeCoursesInArea = (coursesInArea ?? []).filter((c) => !c.is_archived);

  const courseIdForMutation = isEditing ? courseModule!.course_id : fixedCourseId || form.course_id;
  const createModule = useCreateCourseModule(courseIdForMutation);
  const updateModule = useUpdateCourseModule(courseIdForMutation);
  const isPending = createModule.isPending || updateModule.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(
      courseModule
        ? {
            course_id: courseModule.course_id,
            name: courseModule.name,
            description: courseModule.description ?? "",
          }
        : { ...DEFAULT_FORM, course_id: fixedCourseId ?? "" },
    );
    setSelectedAreaId("");
    setErrors({});
    const id = window.setTimeout(() => nameRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, courseModule, fixedCourseId]);

  const needsAreaAndCourse = !isEditing && !fixedCourseId;
  const noAreasAvailable = needsAreaAndCourse && activeAreas.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current || noAreasAvailable) return;

    const parsed = courseModuleSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) nextErrors[String(issue.path[0])] = issue.message;
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    submittingRef.current = true;
    try {
      if (isEditing && courseModule) {
        await updateModule.mutateAsync({
          id: courseModule.id,
          patch: { name: parsed.data.name, description: parsed.data.description || null },
        });
        toast.success("Módulo atualizado");
      } else {
        const created = await createModule.mutateAsync({
          course_id: parsed.data.course_id,
          name: parsed.data.name,
          description: parsed.data.description || null,
        });
        toast.success("Módulo criado");
        onCreated?.(created);
      }
      onOpenChange(false);
    } catch (err) {
      console.error("[courseModuleForm]", err);
      toast.error(
        isEditing ? "Não foi possível atualizar o módulo" : "Não foi possível criar o módulo",
      );
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar módulo" : "Novo módulo"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize o nome ou a descrição deste módulo."
              : "Um bloco de aulas dentro do curso."}
          </DialogDescription>
        </DialogHeader>

        {noAreasAvailable ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você ainda não tem nenhuma área de conhecimento. Crie uma área e um curso primeiro
              para poder cadastrar um módulo.
            </p>
            <DialogFooter>
              <Button asChild>
                <Link to="/app/meus-estudos">Ir para Estudos</Link>
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {needsAreaAndCourse ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="module-area">Área</Label>
                  <Select
                    value={selectedAreaId}
                    onValueChange={(v) => {
                      setSelectedAreaId(v);
                      setForm((f) => ({ ...f, course_id: "" }));
                    }}
                  >
                    <SelectTrigger id="module-area">
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="module-course">Curso</Label>
                  {selectedAreaId && activeCoursesInArea.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Esta área ainda não tem cursos.{" "}
                      <Link
                        to="/app/meus-estudos/$areaId"
                        params={{ areaId: selectedAreaId }}
                        className="underline"
                      >
                        Criar um curso
                      </Link>
                    </p>
                  ) : (
                    <Select
                      value={form.course_id}
                      onValueChange={(v) => setForm((f) => ({ ...f, course_id: v }))}
                      disabled={!selectedAreaId}
                    >
                      <SelectTrigger id="module-course" aria-invalid={!!errors.course_id}>
                        <SelectValue placeholder="Selecione um curso" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeCoursesInArea.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {errors.course_id ? (
                    <p className="text-xs text-destructive" role="alert">
                      {errors.course_id}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor={nameId}>Nome</Label>
              <Input
                id={nameId}
                ref={nameRef}
                value={form.name}
                maxLength={120}
                placeholder="Ex.: Módulo 1 — Fundamentos"
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

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : isEditing ? (
                  "Salvar alterações"
                ) : (
                  "Criar módulo"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
