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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStudyAreas } from "@/features/studies/hooks/use-study-areas";
import { useCoursesByArea } from "@/features/studies/hooks/use-courses";
import { plannedStudyFormSchema } from "./schema";
import type { PlannedStudyRow } from "./types";
import { useCreatePlannedStudy, useUpdatePlannedStudy } from "./hooks";

const NONE = "__none__";

interface PlannedStudyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Data padrão (YYYY-MM-DD) quando criando a partir de um dia da grade. */
  defaultDate: string;
  /** Quando presente, o formulário edita este registro. */
  plannedStudy?: PlannedStudyRow;
}

export function PlannedStudyFormDialog({
  open,
  onOpenChange,
  defaultDate,
  plannedStudy,
}: PlannedStudyFormDialogProps) {
  const isEditing = !!plannedStudy;
  const titleId = useId();
  const dateId = useId();
  const minutesId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  const [title, setTitle] = useState("");
  const [scheduledDate, setScheduledDate] = useState(defaultDate);
  const [areaId, setAreaId] = useState<string>(NONE);
  const [courseId, setCourseId] = useState<string>(NONE);
  const [minutes, setMinutes] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: areas } = useStudyAreas();
  const activeAreas = (areas ?? []).filter((a) => !a.is_archived);
  const { data: coursesInArea } = useCoursesByArea(areaId !== NONE ? areaId : undefined);
  const activeCourses = (coursesInArea ?? []).filter((c) => !c.is_archived);

  const createMut = useCreatePlannedStudy();
  const updateMut = useUpdatePlannedStudy();
  const pending = createMut.isPending || updateMut.isPending;

  // Ressincroniza o formulário toda vez que abre (ou muda o alvo/dia).
  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (plannedStudy) {
      setTitle(plannedStudy.title);
      setScheduledDate(plannedStudy.scheduled_date);
      setAreaId(plannedStudy.study_area_id ?? NONE);
      setCourseId(plannedStudy.course_id ?? NONE);
      setMinutes(plannedStudy.estimated_minutes != null ? String(plannedStudy.estimated_minutes) : "");
    } else {
      setTitle("");
      setScheduledDate(defaultDate);
      setAreaId(NONE);
      setCourseId(NONE);
      setMinutes("");
    }
    requestAnimationFrame(() => titleRef.current?.focus());
  }, [open, plannedStudy, defaultDate]);

  // Se a área muda, zera o curso (curso pertence a uma área).
  function handleAreaChange(value: string) {
    setAreaId(value);
    setCourseId(NONE);
  }

  function handleSubmit() {
    if (submittingRef.current) return;

    const parsed = plannedStudyFormSchema.safeParse({
      title,
      scheduledDate,
      studyAreaId: areaId !== NONE ? areaId : null,
      courseId: courseId !== NONE ? courseId : null,
      estimatedMinutes: minutes.trim() === "" ? null : Number(minutes),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    submittingRef.current = true;
    const values = parsed.data;
    const onDone = () => {
      submittingRef.current = false;
    };

    if (isEditing) {
      updateMut.mutate(
        { id: plannedStudy!.id, input: values },
        {
          onSuccess: () => {
            toast.success("Estudo atualizado");
            onOpenChange(false);
          },
          onError: () => toast.error("Não foi possível atualizar"),
          onSettled: onDone,
        },
      );
    } else {
      createMut.mutate(values, {
        onSuccess: () => {
          toast.success("Estudo planejado");
          onOpenChange(false);
        },
        onError: () => toast.error("Não foi possível salvar"),
        onSettled: onDone,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar estudo planejado" : "Novo estudo planejado"}</DialogTitle>
          <DialogDescription>
            Organize o que estudar. Área e curso são opcionais.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={titleId}>Título</Label>
            <Input
              id={titleId}
              ref={titleRef}
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Revisar cinemática"
            />
            {errors.title ? <p className="text-sm text-destructive">{errors.title}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={dateId}>Data</Label>
            <Input
              id={dateId}
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
            {errors.scheduledDate ? (
              <p className="text-sm text-destructive">{errors.scheduledDate}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Área (opcional)</Label>
            <Select value={areaId} onValueChange={handleAreaChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sem área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem área</SelectItem>
                {activeAreas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Curso (opcional)</Label>
            <Select
              value={courseId}
              onValueChange={setCourseId}
              disabled={areaId === NONE || activeCourses.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={areaId === NONE ? "Escolha uma área antes" : "Sem curso"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem curso</SelectItem>
                {activeCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={minutesId}>Minutos estimados (opcional)</Label>
            <Input
              id={minutesId}
              type="number"
              min={1}
              max={1440}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="Ex.: 45"
            />
            {errors.estimatedMinutes ? (
              <p className="text-sm text-destructive">{errors.estimatedMinutes}</p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {isEditing ? "Salvar" : "Planejar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
