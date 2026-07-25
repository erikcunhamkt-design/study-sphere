import { Link } from "@tanstack/react-router";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useReorderLessons, useToggleLessonCompletion } from "../hooks/use-lessons";
import type { CourseModule, Lesson } from "../types";
import { calculateModuleProgress } from "../utils";
import { moveId, ReorderButtons } from "./reorder-buttons";
import { LessonRow } from "./lesson-row";

interface ModuleTreeItemProps {
  courseModule: CourseModule;
  /** Todas as aulas deste módulo (sem filtro) — usadas só para o progresso. */
  allLessons: Lesson[];
  /** Aulas já filtradas/buscadas prontas para exibir. */
  shownLessons: Lesson[];
  areaId: string;
  courseId: string;
  isOpen: boolean;
  onToggleOpen: () => void;
  canReorderModule: boolean;
  moduleReorder: {
    disabledUp: boolean;
    disabledDown: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
  };
  canReorderLessons: boolean;
  onAddLesson: () => void;
  onEditModule: () => void;
  onArchiveModule: () => void;
  onRestoreModule: () => void;
  onDeleteModule: () => void;
  onEditLesson: (lesson: Lesson) => void;
  onArchiveLesson: (lesson: Lesson) => void;
  onRestoreLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lesson: Lesson) => void;
}

export function ModuleTreeItem({
  courseModule,
  allLessons,
  shownLessons,
  areaId,
  courseId,
  isOpen,
  onToggleOpen,
  canReorderModule,
  moduleReorder,
  canReorderLessons,
  onAddLesson,
  onEditModule,
  onArchiveModule,
  onRestoreModule,
  onDeleteModule,
  onEditLesson,
  onArchiveLesson,
  onRestoreLesson,
  onDeleteLesson,
}: ModuleTreeItemProps) {
  const moduleProgress = calculateModuleProgress(allLessons);
  const toggleCompletion = useToggleLessonCompletion(courseModule.id, courseId);
  const reorderLessons = useReorderLessons(courseModule.id, courseId);

  async function handleToggleLesson(lesson: Lesson) {
    try {
      await toggleCompletion(lesson);
    } catch (err) {
      console.error("[toggleLessonCompletion]", err);
      toast.error("Não foi possível atualizar a conclusão da aula");
    }
  }

  async function handleMoveLesson(index: number, direction: "up" | "down") {
    const activeIds = shownLessons.map((l) => l.id);
    const nextIds = moveId(activeIds, index, direction);
    if (nextIds === activeIds) return;
    try {
      await reorderLessons.mutateAsync(nextIds);
    } catch (err) {
      console.error("[reorderLessons]", err);
      toast.error("Não foi possível salvar a nova ordem", {
        description: "A lista foi restaurada para a ordem anterior.",
      });
    }
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={onToggleOpen}
      className="rounded-xl border border-border bg-surface"
    >
      <div
        className={`flex items-center gap-2 p-3 ${courseModule.is_archived ? "opacity-70" : ""}`}
      >
        {canReorderModule ? (
          <ReorderButtons label={`módulo ${courseModule.name}`} {...moduleReorder} />
        ) : null}

        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="shrink-0 rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={isOpen}
            aria-label={isOpen ? `Recolher ${courseModule.name}` : `Expandir ${courseModule.name}`}
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            )}
          </button>
        </CollapsibleTrigger>

        <Link
          to="/app/estudos/$areaId/cursos/$courseId/modulos/$moduleId"
          params={{ areaId, courseId, moduleId: courseModule.id }}
          className="min-w-0 flex-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">
              {courseModule.name}
            </span>
            {courseModule.is_archived ? (
              <Badge variant="secondary" className="text-[10px]">
                Arquivado
              </Badge>
            ) : null}
            <span className="text-xs text-muted-foreground">
              {moduleProgress.completedCount}/{moduleProgress.totalCount} · {moduleProgress.percent}
              %
            </span>
          </div>
          {courseModule.description ? (
            <p className="truncate text-xs text-muted-foreground">{courseModule.description}</p>
          ) : null}
        </Link>

        <Button
          variant="ghost"
          size="sm"
          onClick={onAddLesson}
          aria-label={`Nova aula em ${courseModule.name}`}
        >
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden /> Aula
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label={`Ações de ${courseModule.name}`}
            >
              <MoreVertical className="h-4 w-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEditModule}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden /> Editar
            </DropdownMenuItem>
            {courseModule.is_archived ? (
              <DropdownMenuItem onClick={onRestoreModule}>
                <ArchiveRestore className="mr-2 h-4 w-4" aria-hidden /> Restaurar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={onArchiveModule}>
                <Archive className="mr-2 h-4 w-4" aria-hidden /> Arquivar
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDeleteModule}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Excluir permanentemente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CollapsibleContent className="space-y-2 border-t border-border p-3">
        {shownLessons.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            {allLessons.length === 0
              ? "Nenhuma aula neste módulo ainda."
              : "Nenhuma aula corresponde à busca ou aos filtros atuais."}
          </p>
        ) : (
          shownLessons.map((lesson, lessonIndex) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              areaId={areaId}
              courseId={courseId}
              onToggleComplete={() => handleToggleLesson(lesson)}
              onEdit={() => onEditLesson(lesson)}
              onArchive={() => onArchiveLesson(lesson)}
              onRestore={() => onRestoreLesson(lesson)}
              onDelete={() => onDeleteLesson(lesson)}
              reorder={
                canReorderLessons
                  ? {
                      disabledUp: lessonIndex === 0,
                      disabledDown: lessonIndex === shownLessons.length - 1,
                      onMoveUp: () => handleMoveLesson(lessonIndex, "up"),
                      onMoveDown: () => handleMoveLesson(lessonIndex, "down"),
                    }
                  : undefined
              }
            />
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
