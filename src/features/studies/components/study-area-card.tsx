import { Link } from "@tanstack/react-router";
import { Archive, ArchiveRestore, BookOpen, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { StudyAreaWithCounts } from "../types";
import { resolveAreaColorTokens, resolveAreaIcon } from "../utils";
import { ReorderButtons } from "./reorder-buttons";

interface StudyAreaCardProps {
  area: StudyAreaWithCounts;
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

export function StudyAreaCard({
  area,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  reorder,
}: StudyAreaCardProps) {
  const Icon = resolveAreaIcon(area.icon);
  const tokens = resolveAreaColorTokens(area.color);

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40",
        area.is_archived && "opacity-70",
      )}
    >
      {reorder ? (
        <ReorderButtons
          label={`área ${area.name}`}
          disabledUp={reorder.disabledUp}
          disabledDown={reorder.disabledDown}
          onMoveUp={reorder.onMoveUp}
          onMoveDown={reorder.onMoveDown}
        />
      ) : null}

      <Link
        to="/app/estudos/$areaId"
        params={{ areaId: area.id }}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", tokens.chip)}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">{area.name}</h3>
            {area.is_archived ? (
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                Arquivada
              </Badge>
            ) : null}
          </div>
          {area.description ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">{area.description}</p>
          ) : null}
          <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3 w-3" aria-hidden />
              {area.courseCount === 1 ? "1 curso" : `${area.courseCount} cursos`}
            </span>
            {area.inProgressCount > 0 ? <span>{area.inProgressCount} em andamento</span> : null}
          </div>
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={`Ações de ${area.name}`}
          >
            <MoreVertical className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden /> Editar
          </DropdownMenuItem>
          {area.is_archived ? (
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
