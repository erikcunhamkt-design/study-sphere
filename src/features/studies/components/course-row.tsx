import { Link } from "@tanstack/react-router";
import { Archive, ArchiveRestore, MoreVertical, Pencil, Star, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Course, CourseStatus } from "../types";
import { COURSE_STATUS_BADGE_VARIANT, COURSE_STATUS_LABELS } from "../utils";
import { ReorderButtons } from "./reorder-buttons";

interface CourseRowProps {
  course: Course;
  areaId: string;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onSetStatus: (status: CourseStatus) => void;
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

export function CourseRow({
  course,
  areaId,
  onEdit,
  onToggleFavorite,
  onSetStatus,
  onArchive,
  onRestore,
  onDelete,
  reorder,
}: CourseRowProps) {
  const updatedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(course.updated_at),
  );

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5",
        course.is_archived && "opacity-70",
      )}
    >
      {reorder ? (
        <ReorderButtons
          label={`curso ${course.name}`}
          disabledUp={reorder.disabledUp}
          disabledDown={reorder.disabledDown}
          onMoveUp={reorder.onMoveUp}
          onMoveDown={reorder.onMoveDown}
        />
      ) : null}

      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={course.is_favorite ? "Remover dos favoritos" : "Marcar como favorito"}
        aria-pressed={course.is_favorite}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Star
          className={cn("h-4 w-4", course.is_favorite && "fill-amber-500 text-amber-500")}
          aria-hidden
        />
      </button>

      <Link
        to="/app/curso/$courseId"
        params={{ courseId: course.id }}
        className="min-w-0 flex-1 space-y-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="truncate text-sm font-medium text-foreground">{course.name}</h4>
          <Badge variant={COURSE_STATUS_BADGE_VARIANT[course.status]} className="text-[10px]">
            {COURSE_STATUS_LABELS[course.status]}
          </Badge>
          {course.is_archived ? (
            <Badge variant="secondary" className="text-[10px]">
              Arquivado
            </Badge>
          ) : null}
        </div>
        {course.description ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">{course.description}</p>
        ) : null}
        <p className="text-[11px] text-muted-foreground">Atualizado em {updatedAt}</p>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={`Ações de ${course.name}`}
          >
            <MoreVertical className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden /> Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
            Alterar status
          </DropdownMenuLabel>
          {(Object.keys(COURSE_STATUS_LABELS) as CourseStatus[]).map((status) => (
            <DropdownMenuItem
              key={status}
              disabled={status === course.status}
              onClick={() => onSetStatus(status)}
            >
              {COURSE_STATUS_LABELS[status]}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {course.is_archived ? (
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
