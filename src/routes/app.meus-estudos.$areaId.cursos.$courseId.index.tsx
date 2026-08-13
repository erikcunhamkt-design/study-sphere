import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Layers,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Star,
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
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/page-shell";
import { ArchiveFilterControl } from "@/features/studies/components/archive-filter-control";
import { CompletionFilterControl } from "@/features/studies/components/completion-filter-control";
import { CourseFormDialog } from "@/features/studies/components/course-form-dialog";
import { CourseModuleFormDialog } from "@/features/studies/components/course-module-form-dialog";
import { DeleteCourseDialog } from "@/features/studies/components/delete-course-dialog";
import { DeleteModuleDialog } from "@/features/studies/components/delete-module-dialog";
import { DeleteLessonDialog } from "@/features/studies/components/delete-lesson-dialog";
import { LessonFormDialog } from "@/features/studies/components/lesson-form-dialog";
import { ModuleTreeItem } from "@/features/studies/components/module-tree-item";
import { moveId } from "@/features/studies/components/reorder-buttons";
import {
  useArchiveCourse,
  useCourse,
  useRestoreCourse,
  useSetCourseStatus,
  useToggleCourseFavorite,
} from "@/features/studies/hooks/use-courses";
import {
  useArchiveCourseModule,
  useReorderCourseModules,
  useRestoreCourseModule,
} from "@/features/studies/hooks/use-course-modules";
import { useCourseTree } from "@/features/studies/hooks/use-course-tree";
import { useArchiveLesson, useRestoreLesson } from "@/features/studies/hooks/use-lessons";
import { useStudyArea } from "@/features/studies/hooks/use-study-areas";
import type { ArchiveFilter, CourseModule, CourseStatus, Lesson } from "@/features/studies/types";
import {
  calculateCourseProgress,
  COURSE_STATUS_BADGE_VARIANT,
  COURSE_STATUS_LABELS,
  filterByArchiveState,
  filterByCompletion,
  isCourseOutsideArea,
  isTreeFiltering,
  type LessonCompletionFilter,
  matchesSearch,
  searchLessons,
} from "@/features/studies/utils";

export const Route = createFileRoute("/app/meus-estudos/$areaId/cursos/$courseId/")({
  component: CourseDetailPage,
});

function CourseDetailPage() {
  const { areaId, courseId } = Route.useParams();
  const { data: course, isLoading: courseLoading, isError: courseError } = useCourse(courseId);
  const { data: area, isLoading: areaLoading, isError: areaError } = useStudyArea(areaId);

  const isLoading = courseLoading || areaLoading;
  const notFound =
    !isLoading && (courseError || areaError || !area || isCourseOutsideArea(course, areaId));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (notFound) {
    return <CourseNotFound areaId={areaId} />;
  }

  return <CourseContent course={course!} area={area!} areaId={areaId} courseId={courseId} />;
}

function CourseNotFound({ areaId }: { areaId: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Curso não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este curso não existe ou não está disponível para a sua conta.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link to="/app/estudos/$areaId" params={{ areaId }}>
              Voltar para a área
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function CourseContent({
  course,
  area,
  areaId,
  courseId,
}: {
  course: NonNullable<ReturnType<typeof useCourse>["data"]>;
  area: NonNullable<ReturnType<typeof useStudyArea>["data"]>;
  areaId: string;
  courseId: string;
}) {
  const navigate = useNavigate();
  const toggleFavorite = useToggleCourseFavorite(areaId);
  const setStatus = useSetCourseStatus(areaId);
  const archiveCourse = useArchiveCourse(areaId);
  const restoreCourse = useRestoreCourse(areaId);

  const { modules, lessons, isLoading, isError } = useCourseTree(courseId);
  const reorderModules = useReorderCourseModules(courseId);
  const archiveModule = useArchiveCourseModule(courseId);
  const restoreModule = useRestoreCourseModule(courseId);
  const archiveLesson = useArchiveLesson(undefined, courseId);
  const restoreLesson = useRestoreLesson(undefined, courseId);

  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [courseDeleteOpen, setCourseDeleteOpen] = useState(false);
  const [moduleFormOpen, setModuleFormOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | undefined>(undefined);
  const [deletingModule, setDeletingModule] = useState<CourseModule | null>(null);
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [lessonFormModuleId, setLessonFormModuleId] = useState<string | undefined>(undefined);
  const [editingLesson, setEditingLesson] = useState<Lesson | undefined>(undefined);
  const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const [completionFilter, setCompletionFilter] = useState<LessonCompletionFilter>("all");

  const createdAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(course.created_at),
  );
  const updatedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(course.updated_at));

  const progress = useMemo(
    () => calculateCourseProgress(modules ?? [], lessons ?? []),
    [modules, lessons],
  );

  const lessonsByModule = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    for (const lesson of lessons ?? []) {
      const list = map.get(lesson.module_id) ?? [];
      list.push(lesson);
      map.set(lesson.module_id, list);
    }
    return map;
  }, [lessons]);

  const isFiltering = isTreeFiltering(archiveFilter, search, completionFilter);
  const canReorder = !isFiltering;

  const visibleModules = useMemo(() => {
    const archiveFiltered = filterByArchiveState(modules ?? [], archiveFilter);
    if (!search.trim()) return archiveFiltered;
    const query = search.trim();
    return archiveFiltered.filter((m) => {
      if (matchesSearch(m.name, query) || matchesSearch(m.description ?? "", query)) return true;
      const moduleLessons = lessonsByModule.get(m.id) ?? [];
      return searchLessons(moduleLessons, query).length > 0;
    });
  }, [modules, archiveFilter, search, lessonsByModule]);

  function lessonsToShow(moduleId: string, moduleMatchesSearch: boolean): Lesson[] {
    const all = lessonsByModule.get(moduleId) ?? [];
    let list = filterByArchiveState(all, archiveFilter);
    list = filterByCompletion(list, completionFilter);
    if (search.trim() && !moduleMatchesSearch) list = searchLessons(list, search);
    return list;
  }

  function toggleExpanded(moduleId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  function openCreateModule() {
    setEditingModule(undefined);
    setModuleFormOpen(true);
  }

  function openEditModule(courseModule: CourseModule) {
    setEditingModule(courseModule);
    setModuleFormOpen(true);
  }

  function openCreateLesson(moduleId: string) {
    setLessonFormModuleId(moduleId);
    setEditingLesson(undefined);
    setLessonFormOpen(true);
    setExpanded((prev) => new Set(prev).add(moduleId));
  }

  function openEditLesson(lesson: Lesson) {
    setLessonFormModuleId(lesson.module_id);
    setEditingLesson(lesson);
    setLessonFormOpen(true);
  }

  async function handleToggleFavorite() {
    try {
      await toggleFavorite(course);
    } catch (err) {
      console.error("[toggleCourseFavorite]", err);
      toast.error("Não foi possível atualizar o favorito");
    }
  }

  async function handleSetStatus(status: CourseStatus) {
    try {
      await setStatus(course.id, status);
      toast.success("Status atualizado");
    } catch (err) {
      console.error("[setCourseStatus]", err);
      toast.error("Não foi possível atualizar o status");
    }
  }

  async function handleArchiveCourse() {
    try {
      await archiveCourse(course.id);
      toast.success("Curso arquivado");
    } catch (err) {
      console.error("[archiveCourse]", err);
      toast.error("Não foi possível arquivar o curso");
    }
  }

  async function handleRestoreCourse() {
    try {
      await restoreCourse(course.id);
      toast.success("Curso restaurado");
    } catch (err) {
      console.error("[restoreCourse]", err);
      toast.error("Não foi possível restaurar o curso");
    }
  }

  async function handleArchiveModule(courseModule: CourseModule) {
    try {
      await archiveModule(courseModule.id);
      toast.success("Módulo arquivado");
    } catch (err) {
      console.error("[archiveCourseModule]", err);
      toast.error("Não foi possível arquivar o módulo");
    }
  }

  async function handleRestoreModule(courseModule: CourseModule) {
    try {
      await restoreModule(courseModule.id);
      toast.success("Módulo restaurado");
    } catch (err) {
      console.error("[restoreCourseModule]", err);
      toast.error("Não foi possível restaurar o módulo");
    }
  }

  async function handleMoveModule(index: number, direction: "up" | "down") {
    if (!modules) return;
    const activeIds = filterByArchiveState(modules, "active").map((m) => m.id);
    const nextIds = moveId(activeIds, index, direction);
    if (nextIds === activeIds) return;
    try {
      await reorderModules.mutateAsync(nextIds);
    } catch (err) {
      console.error("[reorderCourseModules]", err);
      toast.error("Não foi possível salvar a nova ordem", {
        description: "A lista foi restaurada para a ordem anterior.",
      });
    }
  }

  async function handleArchiveLesson(lesson: Lesson) {
    try {
      await archiveLesson(lesson.id);
      toast.success("Aula arquivada");
    } catch (err) {
      console.error("[archiveLesson]", err);
      toast.error("Não foi possível arquivar a aula");
    }
  }

  async function handleRestoreLesson(lesson: Lesson) {
    try {
      await restoreLesson(lesson.id);
      toast.success("Aula restaurada");
    } catch (err) {
      console.error("[restoreLesson]", err);
      toast.error("Não foi possível restaurar a aula");
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
            <BreadcrumbLink asChild>
              <Link to="/app/estudos/$areaId" params={{ areaId }}>
                {area.name}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{course.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{course.name}</h1>
            <Badge variant={COURSE_STATUS_BADGE_VARIANT[course.status]}>
              {COURSE_STATUS_LABELS[course.status]}
            </Badge>
            {course.is_archived ? <Badge variant="secondary">Arquivado</Badge> : null}
          </div>
          {course.description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">{course.description}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Área:{" "}
            <Link
              to="/app/estudos/$areaId"
              params={{ areaId }}
              className="underline hover:text-foreground"
            >
              {area.name}
            </Link>{" "}
            · Criado em {createdAt} · Atualizado em {updatedAt}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateModule}>
            <Plus className="mr-2 h-4 w-4" aria-hidden /> Novo módulo
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleToggleFavorite}
            aria-label={course.is_favorite ? "Remover dos favoritos" : "Marcar como favorito"}
            aria-pressed={course.is_favorite}
          >
            <Star
              className={course.is_favorite ? "h-4 w-4 fill-amber-500 text-amber-500" : "h-4 w-4"}
              aria-hidden
            />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Ações do curso">
                <MoreVertical className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCourseFormOpen(true)}>
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
                  onClick={() => handleSetStatus(status)}
                >
                  {COURSE_STATUS_LABELS[status]}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {course.is_archived ? (
                <DropdownMenuItem onClick={handleRestoreCourse}>
                  <ArchiveRestore className="mr-2 h-4 w-4" aria-hidden /> Restaurar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleArchiveCourse}>
                  <Archive className="mr-2 h-4 w-4" aria-hidden /> Arquivar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setCourseDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Excluir permanentemente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Métricas estruturais reais */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{progress.moduleCount}</strong>{" "}
              {progress.moduleCount === 1 ? "módulo ativo" : "módulos ativos"}
            </span>
            <span>
              <strong className="text-foreground">{progress.lessonCount}</strong>{" "}
              {progress.lessonCount === 1 ? "aula ativa" : "aulas ativas"}
            </span>
            <span>
              <strong className="text-foreground">{progress.completedCount}</strong> concluídas
            </span>
          </div>
          <span className="text-sm font-medium text-foreground" aria-hidden>
            {progress.percent}%
          </span>
        </div>
        <Progress
          value={progress.percent}
          className="mt-3"
          aria-label={`Progresso do curso: ${progress.completedCount} de ${progress.lessonCount} aulas concluídas, ${progress.percent}%`}
        />
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
            placeholder="Buscar módulos ou aulas..."
            className="pl-8"
            aria-label="Buscar módulos ou aulas"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ArchiveFilterControl value={archiveFilter} onChange={setArchiveFilter} />
          <CompletionFilterControl value={completionFilter} onChange={setCompletionFilter} />
        </div>
      </div>

      {isFiltering ? (
        <p className="text-xs text-muted-foreground">
          Reordenação desabilitada durante busca ou filtro — volte para "Ativas" sem busca e com
          conclusão em "Todas" para reordenar.
        </p>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<Layers className="h-5 w-5" aria-hidden />}
          title="Não foi possível carregar a estrutura do curso"
          description="Verifique sua conexão e tente novamente em instantes."
        />
      ) : !modules || modules.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-5 w-5" aria-hidden />}
          title="Nenhum módulo neste curso"
          description="Crie um módulo para começar a organizar as aulas deste curso."
          action={
            <Button onClick={openCreateModule}>
              <Plus className="mr-2 h-4 w-4" aria-hidden /> Criar módulo
            </Button>
          }
        />
      ) : visibleModules.length === 0 ? (
        <EmptyState
          icon={<Search className="h-5 w-5" aria-hidden />}
          title="Nenhum módulo ou aula encontrado"
          description="Ajuste a busca ou os filtros para ver outros resultados."
        />
      ) : (
        <div className="space-y-3">
          {visibleModules.map((courseModule, index) => {
            const moduleMatches =
              !search.trim() ||
              matchesSearch(courseModule.name, search) ||
              matchesSearch(courseModule.description ?? "", search);
            const shownLessons = lessonsToShow(courseModule.id, moduleMatches);
            const moduleAllLessons = lessonsByModule.get(courseModule.id) ?? [];

            return (
              <ModuleTreeItem
                key={courseModule.id}
                courseModule={courseModule}
                allLessons={moduleAllLessons}
                shownLessons={shownLessons}
                areaId={areaId}
                courseId={courseId}
                isOpen={expanded.has(courseModule.id)}
                onToggleOpen={() => toggleExpanded(courseModule.id)}
                canReorderModule={canReorder}
                moduleReorder={{
                  disabledUp: index === 0,
                  disabledDown: index === visibleModules.length - 1,
                  onMoveUp: () => handleMoveModule(index, "up"),
                  onMoveDown: () => handleMoveModule(index, "down"),
                }}
                canReorderLessons={canReorder}
                onAddLesson={() => openCreateLesson(courseModule.id)}
                onEditModule={() => openEditModule(courseModule)}
                onArchiveModule={() => handleArchiveModule(courseModule)}
                onRestoreModule={() => handleRestoreModule(courseModule)}
                onDeleteModule={() => setDeletingModule(courseModule)}
                onEditLesson={openEditLesson}
                onArchiveLesson={handleArchiveLesson}
                onRestoreLesson={handleRestoreLesson}
                onDeleteLesson={setDeletingLesson}
              />
            );
          })}
        </div>
      )}

      <CourseFormDialog
        open={courseFormOpen}
        onOpenChange={setCourseFormOpen}
        fixedAreaId={areaId}
        course={course}
      />
      <DeleteCourseDialog
        open={courseDeleteOpen}
        onOpenChange={setCourseDeleteOpen}
        course={course}
        moduleCount={modules?.length ?? 0}
        lessonCount={lessons?.length ?? 0}
        onDeleted={() => navigate({ to: "/app/estudos/$areaId", params: { areaId } })}
      />
      <CourseModuleFormDialog
        open={moduleFormOpen}
        onOpenChange={setModuleFormOpen}
        fixedCourseId={courseId}
        courseModule={editingModule}
      />
      <DeleteModuleDialog
        open={!!deletingModule}
        onOpenChange={(open) => !open && setDeletingModule(null)}
        courseModule={deletingModule}
        lessonCount={deletingModule ? (lessonsByModule.get(deletingModule.id)?.length ?? 0) : 0}
      />
      <LessonFormDialog
        open={lessonFormOpen}
        onOpenChange={setLessonFormOpen}
        fixedCourseId={courseId}
        fixedModuleId={lessonFormModuleId}
        lesson={editingLesson}
      />
      <DeleteLessonDialog
        open={!!deletingLesson}
        onOpenChange={(open) => !open && setDeletingLesson(null)}
        lesson={deletingLesson}
      />
    </div>
  );
}
