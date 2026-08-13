import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, PageHeader } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArchiveFilterControl } from "@/features/studies/components/archive-filter-control";
import { DeleteStudyAreaDialog } from "@/features/studies/components/delete-study-area-dialog";
import { StudyAreaCard } from "@/features/studies/components/study-area-card";
import { StudyAreaFormDialog } from "@/features/studies/components/study-area-form-dialog";
import {
  useArchiveStudyArea,
  useRestoreStudyArea,
  useReorderStudyAreas,
  useStudyAreasWithCounts,
} from "@/features/studies/hooks/use-study-areas";
import { useAllCourses } from "@/features/studies/hooks/use-courses";
import { useAllCourseModules } from "@/features/studies/hooks/use-course-modules";
import { useAllLessons } from "@/features/studies/hooks/use-lessons";
import { moveId } from "@/features/studies/components/reorder-buttons";
import type { ArchiveFilter, StudyArea, StudyAreaWithCounts } from "@/features/studies/types";
import { filterByArchiveState, searchStudyAreas } from "@/features/studies/utils";

export const Route = createFileRoute("/app/meus-estudos/")({
  component: EstudosPage,
});

function EstudosPage() {
  const { data: areas, isLoading, isError } = useStudyAreasWithCounts();
  const reorderAreas = useReorderStudyAreas();
  const archiveArea = useArchiveStudyArea();
  const restoreArea = useRestoreStudyArea();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ArchiveFilter>("active");
  const [formOpen, setFormOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<StudyArea | undefined>(undefined);
  const [deletingArea, setDeletingArea] = useState<StudyAreaWithCounts | null>(null);

  // Contagens reais de módulos/aulas para a confirmação de exclusão — nunca
  // inventadas, derivadas dos dados já carregados para este usuário.
  const { data: allCourses } = useAllCourses();
  const { data: allModules } = useAllCourseModules();
  const { data: allLessons } = useAllLessons();
  const deletingAreaCourseIds = new Set(
    (allCourses ?? []).filter((c) => c.study_area_id === deletingArea?.id).map((c) => c.id),
  );
  const deletingAreaModuleCount = (allModules ?? []).filter((m) =>
    deletingAreaCourseIds.has(m.course_id),
  ).length;
  const deletingAreaLessonCount = (allLessons ?? []).filter((l) =>
    deletingAreaCourseIds.has(l.course_id),
  ).length;

  const filtered = useMemo(() => {
    if (!areas) return [];
    return searchStudyAreas(filterByArchiveState(areas, filter), search);
  }, [areas, filter, search]);

  const canReorder = filter === "active" && !search.trim();

  function openCreate() {
    setEditingArea(undefined);
    setFormOpen(true);
  }

  function openEdit(area: StudyArea) {
    setEditingArea(area);
    setFormOpen(true);
  }

  async function handleArchive(area: StudyArea) {
    try {
      await archiveArea(area.id);
      toast.success("Área arquivada");
    } catch (err) {
      console.error("[archiveStudyArea]", err);
      toast.error("Não foi possível arquivar a área");
    }
  }

  async function handleRestore(area: StudyArea) {
    try {
      await restoreArea(area.id);
      toast.success("Área restaurada");
    } catch (err) {
      console.error("[restoreStudyArea]", err);
      toast.error("Não foi possível restaurar a área");
    }
  }

  async function handleMove(index: number, direction: "up" | "down") {
    if (!areas) return;
    const activeIds = filterByArchiveState(areas, "active").map((a) => a.id);
    const nextIds = moveId(activeIds, index, direction);
    if (nextIds === activeIds) return;
    try {
      await reorderAreas.mutateAsync(nextIds);
    } catch (err) {
      console.error("[reorderStudyAreas]", err);
      toast.error("Não foi possível salvar a nova ordem", {
        description: "A lista foi restaurada para a ordem anterior.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estudos"
        description="Organize áreas de conhecimento e os cursos dentro de cada uma."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" aria-hidden /> Nova área
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar áreas..."
            className="pl-8"
            aria-label="Buscar áreas"
          />
        </div>
        <ArchiveFilterControl value={filter} onChange={setFilter} />
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" aria-hidden />}
          title="Não foi possível carregar suas áreas"
          description="Verifique sua conexão e tente novamente em instantes."
        />
      ) : !areas || areas.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" aria-hidden />}
          title="Organize seus conhecimentos"
          description="Crie uma área para reunir cursos e conteúdos relacionados, como Marketing, História ou Tecnologia."
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" aria-hidden /> Criar primeira área
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-5 w-5" aria-hidden />}
          title="Nenhuma área encontrada"
          description="Ajuste a busca ou o filtro para ver outras áreas."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((area, index) => (
            <StudyAreaCard
              key={area.id}
              area={area}
              onEdit={() => openEdit(area)}
              onArchive={() => handleArchive(area)}
              onRestore={() => handleRestore(area)}
              onDelete={() => setDeletingArea(area)}
              reorder={
                canReorder
                  ? {
                      disabledUp: index === 0,
                      disabledDown: index === filtered.length - 1,
                      onMoveUp: () => handleMove(index, "up"),
                      onMoveDown: () => handleMove(index, "down"),
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <StudyAreaFormDialog open={formOpen} onOpenChange={setFormOpen} area={editingArea} />
      <DeleteStudyAreaDialog
        open={!!deletingArea}
        onOpenChange={(open) => !open && setDeletingArea(null)}
        area={deletingArea}
        courseCount={deletingArea?.courseCount ?? 0}
        moduleCount={deletingAreaModuleCount}
        lessonCount={deletingAreaLessonCount}
      />
    </div>
  );
}
