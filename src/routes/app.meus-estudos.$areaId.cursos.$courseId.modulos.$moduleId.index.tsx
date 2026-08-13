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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/page-shell";
import { ArchiveFilterControl } from "@/features/studies/components/archive-filter-control";
import { CompletionFilterControl } from "@/features/studies/components/completion-filter-control";
import { CourseModuleFormDialog } from "@/features/studies/components/course-module-form-dialog";
import { DeleteModuleDialog } from "@/features/studies/components/delete-module-dialog";
import { DeleteLessonDialog } from "@/features/studies/components/delete-lesson-dialog";
import { LessonFormDialog } from "@/features/studies/components/lesson-form-dialog";
import { LessonRow } from "@/features/studies/components/lesson-row";
import { moveId } from "@/features/studies/components/reorder-buttons";
import {
  useArchiveCourseModule,
  useCourseModule,
  useRestoreCourseModule,
} from "@/features/studies/hooks/use-course-modules";
import {
  useArchiveLesson,
  useLessonsByModule,
  useReorderLessons,
  useRestoreLesson,
  useToggleLessonCompletion,
} from "@/features/studies/hooks/use-lessons";
import { useCourse } from "@/features/studies/hooks/use-courses";
import { useStudyArea } from "@/features/studies/hooks/use-study-areas";
import type { ArchiveFilter, Lesson } from "@/features/studies/types";
import {
  calculateModuleProgress,
  filterByArchiveState,
  filterByCompletion,
  isCourseOutsideArea,
  isModuleOutsideCourse,
  isTreeFiltering,
  type LessonCompletionFilter,
  searchLessons,
} from "@/features/studies/utils";

export const Route = createFileRoute("/app/estudos/$areaId/cursos/$courseId/modulos/$moduleId/")({
  component: ModuleDetailPage,
});

function ModuleDetailPage() {
  const { areaId, courseId, moduleId } = Route.useParams();
  const { data: area, isLoading: areaLoading, isError: areaError } = useStudyArea(areaId);
  const { data: course, isLoading: courseLoading, isError: courseError } = useCourse(courseId);
  const {
    data: courseModule,
    isLoading: moduleLoading,
    isError: moduleError,
  } = useCourseModule(moduleId);

  const isLoading = areaLoading || courseLoading || moduleLoading;
  const notFound =
    !isLoading &&
    (areaError ||
      courseError ||
      moduleError ||
      !area ||
      !course ||
      isCourseOutsideArea(course, areaId) ||
      isModuleOutsideCourse(courseModule, courseId));

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
    return <ModuleNotFound areaId={areaId} courseId={courseId} />;
  }

  return (
    <ModuleContent
      area={area!}
      course={course!}
      courseModule={courseModule!}
      areaId={areaId}
      courseId={courseId}
      moduleId={moduleId}
    />
  );
}

function ModuleNotFound({ areaId, courseId }: { areaId: string; courseId: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Módulo não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este módulo não existe ou não está disponível para a sua conta.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link to="/app/estudos/$areaId/cursos/$courseId" params={{ areaId, courseId }}>
              Voltar para o curso
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModuleContent({
  area,
  course,
  courseModule,
  areaId,
  courseId,
  moduleId,
}: {
  area: NonNullable<ReturnType<typeof useStudyArea>["data"]>;
  course: NonNullable<ReturnType<typeof useCourse>["data"]>;
  courseModule: NonNullable<ReturnType<typeof useCourseModule>["data"]>;
  areaId: string;
  courseId: string;
  moduleId: string;
}) {
  const navigate = useNavigate();
  const { data: lessons, isLoading, isError } = useLessonsByModule(moduleId);
  const reorderLessons = useReorderLessons(moduleId, courseId);
  const toggleCompletion = useToggleLessonCompletion(moduleId, courseId);
  const archiveLesson = useArchiveLesson(moduleId, courseId);
  const restoreLesson = useRestoreLesson(moduleId, courseId);
  const archiveModule = useArchiveCourseModule(courseId);
  const restoreModule = useRestoreCourseModule(courseId);

  const [moduleFormOpen, setModuleFormOpen] = useState(false);
  const [moduleDeleteOpen, setModuleDeleteOpen] = useState(false);
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | undefined>(undefined);
  const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null);

  const [search, setSearch] = useState("");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const [completionFilter, setCompletionFilter] = useState<LessonCompletionFilter>("all");

  const progress = useMemo(() => calculateModuleProgress(lessons ?? []), [lessons]);

  const filtered = useMemo(() => {
    if (!lessons) return [];
    let list = filterByArchiveState(lessons, archiveFilter);
    list = filterByCompletion(list, completionFilter);
    return searchLessons(list, search);
  }, [lessons, archiveFilter, completionFilter, search]);

  const canReorder = !isTreeFiltering(archiveFilter, search, completionFilter);

  function openCreateLesson() {
    setEditingLesson(undefined);
    setLessonFormOpen(true);
  }

  function openEditLesson(lesson: Lesson) {
    setEditingLesson(lesson);
    setLessonFormOpen(true);
  }

  async function handleToggleLesson(lesson: Lesson) {
    try {
      await toggleCompletion(lesson);
    } catch (err) {
      console.error("[toggleLessonCompletion]", err);
      toast.error("Não foi possível atualizar a conclusão da aula");
    }
  }

  async function handleArchiveLesson(id: string) {
    try {
      await archiveLesson(id);
      toast.success("Aula arquivada");
    } catch (err) {
      console.error("[archiveLesson]", err);
      toast.error("Não foi possível arquivar a aula");
    }
  }

  async function handleRestoreLesson(id: string) {
    try {
      await restoreLesson(id);
      toast.success("Aula restaurada");
    } catch (err) {
      console.error("[restoreLesson]", err);
      toast.error("Não foi possível restaurar a aula");
    }
  }

  async function handleArchiveModule() {
    try {
      await archiveModule(courseModule.id);
      toast.success("Módulo arquivado");
    } catch (err) {
      console.error("[archiveCourseModule]", err);
      toast.error("Não foi possível arquivar o módulo");
    }
  }

  async function handleRestoreModule() {
    try {
      await restoreModule(courseModule.id);
      toast.success("Módulo restaurado");
    } catch (err) {
      console.error("[restoreCourseModule]", err);
      toast.error("Não foi possível restaurar o módulo");
    }
  }

  async function handleMove(index: number, direction: "up" | "down") {
    if (!lessons) return;
    const activeIds = filterByArchiveState(lessons, "active").map((l) => l.id);
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
            <BreadcrumbLink asChild>
              <Link to="/app/estudos/$areaId/cursos/$courseId" params={{ areaId, courseId }}>
                {course.name}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{courseModule.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {courseModule.name}
            </h1>
            {courseModule.is_archived ? <Badge variant="secondary">Arquivado</Badge> : null}
          </div>
          {courseModule.description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">{courseModule.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateLesson}>
            <Plus className="mr-2 h-4 w-4" aria-hidden /> Nova aula
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Ações do módulo">
                <MoreVertical className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setModuleFormOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" aria-hidden /> Editar
              </DropdownMenuItem>
              {courseModule.is_archived ? (
                <DropdownMenuItem onClick={handleRestoreModule}>
                  <ArchiveRestore className="mr-2 h-4 w-4" aria-hidden /> Restaurar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleArchiveModule}>
                  <Archive className="mr-2 h-4 w-4" aria-hidden /> Arquivar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setModuleDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Excluir permanentemente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            <strong className="text-foreground">{progress.completedCount}</strong> de{" "}
            <strong className="text-foreground">{progress.totalCount}</strong> aulas concluídas
          </span>
          <span className="text-sm font-medium text-foreground" aria-hidden>
            {progress.percent}%
          </span>
        </div>
        <Progress
          value={progress.percent}
          className="mt-3"
          aria-label={`Progresso do módulo: ${progress.completedCount} de ${progress.totalCount} aulas concluídas, ${progress.percent}%`}
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
            placeholder="Buscar aulas..."
            className="pl-8"
            aria-label="Buscar aulas"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ArchiveFilterControl value={archiveFilter} onChange={setArchiveFilter} />
          <CompletionFilterControl value={completionFilter} onChange={setCompletionFilter} />
        </div>
      </div>

      {!canReorder ? (
        <p className="text-xs text-muted-foreground">
          Reordenação desabilitada durante busca ou filtro.
        </p>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<ListChecks className="h-5 w-5" aria-hidden />}
          title="Não foi possível carregar as aulas"
          description="Verifique sua conexão e tente novamente em instantes."
        />
      ) : !lessons || lessons.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-5 w-5" aria-hidden />}
          title="Nenhuma aula neste módulo"
          description="Crie a primeira aula para começar a organizar o conteúdo deste módulo."
          action={
            <Button onClick={openCreateLesson}>
              <Plus className="mr-2 h-4 w-4" aria-hidden /> Criar aula
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-5 w-5" aria-hidden />}
          title="Nenhuma aula encontrada"
          description="Ajuste a busca ou os filtros para ver outras aulas."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((lesson, index) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              areaId={areaId}
              courseId={courseId}
              onToggleComplete={() => handleToggleLesson(lesson)}
              onEdit={() => openEditLesson(lesson)}
              onArchive={() => handleArchiveLesson(lesson.id)}
              onRestore={() => handleRestoreLesson(lesson.id)}
              onDelete={() => setDeletingLesson(lesson)}
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

      <CourseModuleFormDialog
        open={moduleFormOpen}
        onOpenChange={setModuleFormOpen}
        fixedCourseId={courseId}
        courseModule={courseModule}
      />
      <DeleteModuleDialog
        open={moduleDeleteOpen}
        onOpenChange={setModuleDeleteOpen}
        courseModule={courseModule}
        lessonCount={lessons?.length ?? 0}
        onDeleted={() =>
          navigate({ to: "/app/estudos/$areaId/cursos/$courseId", params: { areaId, courseId } })
        }
      />
      <LessonFormDialog
        open={lessonFormOpen}
        onOpenChange={setLessonFormOpen}
        fixedCourseId={courseId}
        fixedModuleId={moduleId}
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
