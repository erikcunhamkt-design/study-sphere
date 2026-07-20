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
import { lessonSchema } from "../schemas";
import type { Lesson } from "../types";
import { useStudyAreas } from "../hooks/use-study-areas";
import { useCoursesByArea } from "../hooks/use-courses";
import { useCourseModules } from "../hooks/use-course-modules";
import { useCreateLesson, useUpdateLesson } from "../hooks/use-lessons";

interface LessonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando ambos informados, os campos de curso/módulo ficam fixos (herdados da rota atual). */
  fixedCourseId?: string;
  fixedModuleId?: string;
  lesson?: Lesson;
  onCreated?: (lesson: Lesson) => void;
}

const DEFAULT_FORM = { module_id: "", course_id: "", title: "", description: "" };

export function LessonFormDialog({
  open,
  onOpenChange,
  fixedCourseId,
  fixedModuleId,
  lesson,
  onCreated,
}: LessonFormDialogProps) {
  const isEditing = !!lesson;
  const hasFixedContext = !!fixedCourseId && !!fixedModuleId;
  const titleId = useId();
  const descId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submittingRef = useRef(false);

  const { data: areas } = useStudyAreas();
  const activeAreas = (areas ?? []).filter((a) => !a.is_archived);
  const { data: coursesInArea } = useCoursesByArea(selectedAreaId || undefined);
  const activeCoursesInArea = (coursesInArea ?? []).filter((c) => !c.is_archived);
  const { data: modulesInCourse } = useCourseModules(form.course_id || undefined);
  const activeModulesInCourse = (modulesInCourse ?? []).filter((m) => !m.is_archived);

  const moduleIdForMutation = isEditing ? lesson!.module_id : fixedModuleId || form.module_id;
  const courseIdForMutation = isEditing ? lesson!.course_id : fixedCourseId || form.course_id;
  const createLesson = useCreateLesson(moduleIdForMutation, courseIdForMutation);
  const updateLesson = useUpdateLesson(moduleIdForMutation, courseIdForMutation);
  const isPending = createLesson.isPending || updateLesson.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(
      lesson
        ? {
            module_id: lesson.module_id,
            course_id: lesson.course_id,
            title: lesson.title,
            description: lesson.description ?? "",
          }
        : { ...DEFAULT_FORM, module_id: fixedModuleId ?? "", course_id: fixedCourseId ?? "" },
    );
    setSelectedAreaId("");
    setErrors({});
    const id = window.setTimeout(() => titleRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, lesson, fixedCourseId, fixedModuleId]);

  const needsFullContext = !isEditing && !hasFixedContext;
  const noAreasAvailable = needsFullContext && activeAreas.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current || noAreasAvailable) return;

    const parsed = lessonSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) nextErrors[String(issue.path[0])] = issue.message;
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    submittingRef.current = true;
    try {
      if (isEditing && lesson) {
        await updateLesson.mutateAsync({
          id: lesson.id,
          patch: { title: parsed.data.title, description: parsed.data.description || null },
        });
        toast.success("Aula atualizada");
      } else {
        const created = await createLesson.mutateAsync({
          module_id: parsed.data.module_id,
          course_id: parsed.data.course_id,
          title: parsed.data.title,
          description: parsed.data.description || null,
        });
        toast.success("Aula criada");
        onCreated?.(created);
      }
      onOpenChange(false);
    } catch (err) {
      console.error("[lessonForm]", err);
      toast.error(
        isEditing ? "Não foi possível atualizar a aula" : "Não foi possível criar a aula",
      );
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar aula" : "Nova aula"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize o título ou a descrição desta aula."
              : "Uma aula dentro do módulo."}
          </DialogDescription>
        </DialogHeader>

        {noAreasAvailable ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você ainda não tem nenhuma área de conhecimento. Crie uma área, um curso e um módulo
              primeiro para poder cadastrar uma aula.
            </p>
            <DialogFooter>
              <Button asChild>
                <Link to="/app/estudos">Ir para Estudos</Link>
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {needsFullContext ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="lesson-area">Área</Label>
                  <Select
                    value={selectedAreaId}
                    onValueChange={(v) => {
                      setSelectedAreaId(v);
                      setForm((f) => ({ ...f, course_id: "", module_id: "" }));
                    }}
                  >
                    <SelectTrigger id="lesson-area">
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
                  <Label htmlFor="lesson-course">Curso</Label>
                  {selectedAreaId && activeCoursesInArea.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Esta área ainda não tem cursos.</p>
                  ) : (
                    <Select
                      value={form.course_id}
                      onValueChange={(v) => setForm((f) => ({ ...f, course_id: v, module_id: "" }))}
                      disabled={!selectedAreaId}
                    >
                      <SelectTrigger id="lesson-course" aria-invalid={!!errors.course_id}>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lesson-module">Módulo</Label>
                  {form.course_id && activeModulesInCourse.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Este curso ainda não tem módulos.{" "}
                      <Link
                        to="/app/estudos/$areaId/cursos/$courseId"
                        params={{ areaId: selectedAreaId, courseId: form.course_id }}
                        className="underline"
                      >
                        Criar um módulo
                      </Link>
                    </p>
                  ) : (
                    <Select
                      value={form.module_id}
                      onValueChange={(v) => setForm((f) => ({ ...f, module_id: v }))}
                      disabled={!form.course_id}
                    >
                      <SelectTrigger id="lesson-module" aria-invalid={!!errors.module_id}>
                        <SelectValue placeholder="Selecione um módulo" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeModulesInCourse.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {errors.module_id ? (
                    <p className="text-xs text-destructive" role="alert">
                      {errors.module_id}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor={titleId}>Título</Label>
              <Input
                id={titleId}
                ref={titleRef}
                value={form.title}
                maxLength={160}
                placeholder="Ex.: Introdução ao tema"
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? `${titleId}-err` : undefined}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
              {errors.title ? (
                <p id={`${titleId}-err`} className="text-xs text-destructive" role="alert">
                  {errors.title}
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
                  "Criar aula"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
