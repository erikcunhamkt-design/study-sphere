import { Link } from "@tanstack/react-router";
import { Archive, ArchiveRestore, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Lesson } from "../types";
import { ReorderButtons } from "./reorder-buttons";

interface LessonRowProps {
  lesson: Lesson;
  areaId: string;
  courseId: string;
  onToggleComplete: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  reorder?: {
    disabledUp: boolean;
    disabledDown: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
  };
}

export function LessonRow({
  lesson,
  areaId,
  courseId,
  onToggleComplete,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  reorder,
}: LessonRowProps) {
  const updatedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(lesson.updated_at),
  );
  const checkboxId = `lesson-complete-${lesson.id}`;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-surface p-3",
        lesson.is_archived && "opacity-70",
      )}
    >
      {reorder ? (
        <ReorderButtons
          label={`aula ${lesson.title}`}
          disabledUp={reorder.disabledUp}
          disabledDown={reorder.disabledDown}
          onMoveUp={reorder.onMoveUp}
          onMoveDown={reorder.onMoveDown}
        />
      ) : null}

      <Checkbox
        id={checkboxId}
        checked={lesson.is_completed}
        onCheckedChange={onToggleComplete}
        aria-label={
          lesson.is_completed
            ? `Desmarcar "${lesson.title}" como concluída`
            : `Marcar "${lesson.title}" como concluída`
        }
      />

      <Link
        to="/app/meus-estudos/$areaId/cursos/$courseId/modulos/$moduleId/aulas/$lessonId"
        params={{ areaId, courseId, moduleId: lesson.module_id, lessonId: lesson.id }}
        className="min-w-0 flex-1 space-y-0.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "truncate text-sm font-medium text-foreground",
              lesson.is_completed && "text-muted-foreground line-through",
            )}
          >
            {lesson.title}
          </span>
          <Badge variant={lesson.is_completed ? "outline" : "secondary"} className="text-[10px]">
            {lesson.is_completed ? "Concluída" : "Pendente"}
          </Badge>
          {lesson.is_archived ? (
            <Badge variant="secondary" className="text-[10px]">
              Arquivada
            </Badge>
          ) : null}
        </div>
        {lesson.description ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">{lesson.description}</p>
        ) : null}
        <p className="text-[11px] text-muted-foreground">Atualizada em {updatedAt}</p>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={`Ações de ${lesson.title}`}
          >
            <MoreVertical className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden /> Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {lesson.is_archived ? (
            <DropdownMenuItem onClick={onRestore}>
              <ArchiveRestore className="mr-2 h-4 w-4" aria-hidden /> Restaurar
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onArchive}>
              <Archive className="mr-2 h-4 w-4" aria-hidden /> Arquivar
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Excluir permanentemente
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
