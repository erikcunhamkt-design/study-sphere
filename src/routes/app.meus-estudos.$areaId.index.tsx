import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ListChecks,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/page-shell";
import { ArchiveFilterControl } from "@/features/studies/components/archive-filter-control";
import { CourseFormDialog } from "@/features/studies/components/course-form-dialog";
import { CourseRow } from "@/features/studies/components/course-row";
import { DeleteCourseDialog } from "@/features/studies/components/delete-course-dialog";
import { DeleteStudyAreaDialog } from "@/features/studies/components/delete-study-area-dialog";
import { StudyAreaFormDialog } from "@/features/studies/components/study-area-form-dialog";
import { moveId } from "@/features/studies/components/reorder-buttons";
import {
  useArchiveCourse,
  useCoursesByArea,
  useReorderCourses,
  useRestoreCourse,
  useSetCourseStatus,
  useToggleCourseFavorite,
} from "@/features/studies/hooks/use-courses";
import {
  useArchiveStudyArea,
  useRestoreStudyArea,
  useStudyArea,
} from "@/features/studies/hooks/use-study-areas";
import { useAllCourseModules, useCourseModules } from "@/features/studies/hooks/use-course-modules";
import { useAllLessons, useLessonsByCourse } from "@/features/studies/hooks/use-lessons";
import type { ArchiveFilter, Course, CourseStatus } from "@/features/studies/types";
import {
  filterByArchiveState,
  resolveAreaColorTokens,
  resolveAreaIcon,
  searchCourses,
} from "@/features/studies/utils";

export const Route = createFileRoute("/app/estudos/$areaId/")({
  component: StudyAreaDetailPage,
});

function StudyAreaDetailPage() {
  const { areaId } = Route.useParams();
  const { data: area, isLoading, isError } = useStudyArea(areaId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !area) {
    return <AreaNotFound />;
  }

  return <AreaContent area={area} areaId={areaId} />;
}

function AreaNotFound() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Área não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta área não existe ou não está disponível para a sua conta.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link to="/app/estudos">Voltar para Estudos</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function AreaContent({
  area,
  areaId,
}: {
  area: NonNullable<ReturnType<typeof useStudyArea>["data"]>;
  areaId: string;
}) {
  const navigate = useNavigate();
  const { data: courses, isLoading, isError } = useCoursesByArea(areaId);
  const reorderCourses = useReorderCourses(areaId);
  const archiveArea = useArchiveStudyArea();
  const restoreArea = useRestoreStudyArea();
  const toggleFavorite = useToggleCourseFavorite(areaId);
  const setStatus = useSetCourseStatus(areaId);
  const archiveCourse = useArchiveCourse(areaId);
  const restoreCourse = useRestoreCourse(areaId);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ArchiveFilter>("active");
  const [areaFormOpen, setAreaFormOpen] = useState(false);
  const [areaDeleteOpen, setAreaDeleteOpen] = useState(false);
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | undefined>(undefined);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);

  // Contagens reais para as confirmações de exclusão (área inteira e curso
  // individual) — nunca inventadas, sempre derivadas dos dados carregados.
  const { data: allModules } = useAllCourseModules();
  const { data: allLessons } = useAllLessons();
  const areaCourseIds = new Set((courses ?? []).map((c) => c.id));
  const areaModuleCount = (allModules ?? []).filter((m) => areaCourseIds.has(m.course_id)).length;
  const areaLessonCount = (allLessons ?? []).filter((l) => areaCourseIds.has(l.course_id)).length;
  const { data: deletingCourseModules } = useCourseModules(deletingCourse?.id);
  const { data: deletingCourseLessons } = useLessonsByCourse(deletingCourse?.id);

  const Icon = resolveAreaIcon(area.icon);
  const tokens = resolveAreaColorTokens(area.color);

  const filtered = useMemo(() => {
    if (!courses) return [];
    return searchCourses(filterByArchiveState(courses, filter), search);
  }, [courses, filter, search]);

  const canReorder = filter === "active" && !search.trim();
  const activeCourseCount = (courses ?? []).filter((c) => !c.is_archived).length;

  function openCreateCourse() {
    setEditingCourse(undefined);
    setCourseFormOpen(true);
  }

  function openEditCourse(course: Course) {
    setEditingCourse(course);
    setCourseFormOpen(true);
  }

  async function handleArchiveArea() {
    try {
      await archiveArea(area.id);
      toast.success("Área arquivada");
    } catch (err) {
      console.error("[archiveStudyArea]", err);
      toast.error("Não foi possível arquivar a área");
    }
  }

  async function handleRestoreArea() {
    try {
      await restoreArea(area.id);
      toast.success("Área restaurada");
    } catch (err) {
      console.error("[restoreStudyArea]", err);
      toast.error("Não foi possível restaurar a área");
    }
  }

  async function handleToggleFavorite(course: Course) {
    try {
      await toggleFavorite(course);
    } catch (err) {
      console.error("[toggleCourseFavorite]", err);
      toast.error("Não foi possível atualizar o favorito");
    }
  }

  async function handleSetStatus(id: string, status: CourseStatus) {
    try {
      await setStatus(id, status);
      toast.success("Status atualizado");
    } catch (err) {
      console.error("[setCourseStatus]", err);
      toast.error("Não foi possível atualizar o status");
    }
  }

  async function handleArchiveCourse(id: string) {
    try {
      await archiveCourse(id);
      toast.success("Curso arquivado");
    } catch (err) {
      console.error("[archiveCourse]", err);
      toast.error("Não foi possível arquivar o curso");
    }
  }

  async function handleRestoreCourse(id: string) {
    try {
      await restoreCourse(id);
      toast.success("Curso restaurado");
    } catch (err) {
      console.error("[restoreCourse]", err);
      toast.error("Não foi possível restaurar o curso");
    }
  }

  async function handleMove(index: number, direction: "up" | "down") {
    if (!courses) return;
    const activeIds = filterByArchiveState(courses, "active").map((c) => c.id);
    const nextIds = moveId(activeIds, index, direction);
    if (nextIds === activeIds) return;
    try {
      await reorderCourses.mutateAsync(nextIds);
    } catch (err) {
      console.error("[reorderCourses]", err);
      toast.error("Não foi possível salvar a nova ordem", {
        description: "A lista foi restaurada para a ordem anterior.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/app/estudos">Estudos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{area.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${tokens.chip}`}>
            <Icon className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{area.name}</h1>
            {area.description ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{area.description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateCourse}>
            <Plus className="mr-2 h-4 w-4" aria-hidden /> Novo curso
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Ações da área">
                <MoreVertical className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setAreaFormOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" aria-hidden /> Editar área
              </DropdownMenuItem>
              {area.is_archived ? (
                <DropdownMenuItem onClick={handleRestoreArea}>
                  <ArchiveRestore className="mr-2 h-4 w-4" aria-hidden /> Restaurar área
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleArchiveArea}>
                  <Archive className="mr-2 h-4 w-4" aria-hidden /> Arquivar área
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setAreaDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Excluir permanentemente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cursos..."
            className="pl-8"
            aria-label="Buscar cursos"
          />
        </div>
        <ArchiveFilterControl value={filter} onChange={setFilter} />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<ListChecks className="h-5 w-5" aria-hidden />}
          title="Não foi possível carregar os cursos"
          description="Verifique sua conexão e tente novamente em instantes."
        />
      ) : !courses || courses.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-5 w-5" aria-hidden />}
          title="Nenhum curso nesta área"
          description="Crie um curso, uma disciplina ou uma trilha para começar a organizar seus estudos."
          action={
            <Button onClick={openCreateCourse}>
              <Plus className="mr-2 h-4 w-4" aria-hidden /> Criar curso
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-5 w-5" aria-hidden />}
          title="Nenhum curso encontrado"
          description="Ajuste a busca ou o filtro para ver outros cursos."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((course, index) => (
            <CourseRow
              key={course.id}
              course={course}
              areaId={areaId}
              onEdit={() => openEditCourse(course)}
              onToggleFavorite={() => handleToggleFavorite(course)}
              onSetStatus={(status) => handleSetStatus(course.id, status)}
              onArchive={() => handleArchiveCourse(course.id)}
              onRestore={() => handleRestoreCourse(course.id)}
              onDelete={() => setDeletingCourse(course)}
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

      <StudyAreaFormDialog open={areaFormOpen} onOpenChange={setAreaFormOpen} area={area} />
      <DeleteStudyAreaDialog
        open={areaDeleteOpen}
        onOpenChange={setAreaDeleteOpen}
        area={area}
        courseCount={activeCourseCount}
        moduleCount={areaModuleCount}
        lessonCount={areaLessonCount}
        onDeleted={() => navigate({ to: "/app/estudos" })}
      />
      <CourseFormDialog
        open={courseFormOpen}
        onOpenChange={setCourseFormOpen}
        fixedAreaId={areaId}
        course={editingCourse}
      />
      <DeleteCourseDialog
        open={!!deletingCourse}
        onOpenChange={(open) => !open && setDeletingCourse(null)}
        course={deletingCourse}
        moduleCount={deletingCourseModules?.length ?? 0}
        lessonCount={deletingCourseLessons?.length ?? 0}
      />
    </div>
  );
}
