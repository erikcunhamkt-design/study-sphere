/**
 * CURSO V1 — entender → continuar → organizar.
 *
 * Representação única de um curso: estrutura real, estado real das aulas
 * e entrada direta nas experiências já existentes (Aprender / Revisar /
 * Editor). A organização é uma camada secundária, nunca o modo padrão —
 * todo o CRUD (editar, favoritar, arquivar, restaurar, excluir; em curso,
 * módulo e aula) mora atrás do botão "Organizar curso" e reaproveita os
 * dialogs e mutations já existentes na feature `studies`.
 *
 * Esta é a experiência oficial de um curso. A página antiga
 * (/app/meus-estudos/$areaId/cursos/$courseId) permanece no código como
 * fallback técnico durante a migração, mas deixou de ser destino de
 * navegação.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  FileText,
  MoreVertical,
  Pencil,
  PenLine,
  Plus,
  Settings2,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CourseFormDialog } from "@/features/studies/components/course-form-dialog";
import { CourseModuleFormDialog } from "@/features/studies/components/course-module-form-dialog";
import { DeleteCourseDialog } from "@/features/studies/components/delete-course-dialog";
import { DeleteModuleDialog } from "@/features/studies/components/delete-module-dialog";
import { DeleteLessonDialog } from "@/features/studies/components/delete-lesson-dialog";
import { LessonFormDialog } from "@/features/studies/components/lesson-form-dialog";
import { moveId, ReorderButtons } from "@/features/studies/components/reorder-buttons";
import {
  useArchiveCourse,
  useRestoreCourse,
  useToggleCourseFavorite,
} from "@/features/studies/hooks/use-courses";
import {
  useArchiveCourseModule,
  useReorderCourseModules,
  useRestoreCourseModule,
} from "@/features/studies/hooks/use-course-modules";
import {
  useArchiveLesson,
  useReorderLessons,
  useRestoreLesson,
} from "@/features/studies/hooks/use-lessons";
import { useLessonDocument } from "@/features/lesson-editor/hooks";
import {
  useCourseOverview,
  type LessonView,
  type ModuleView,
} from "@/features/course-view/use-course-overview";
import {
  LESSON_STATE_CLASSES,
  LESSON_STATE_CTA,
  LESSON_STATE_LABELS,
} from "@/features/course-view/lesson-state";
import type { CourseModule, Lesson } from "@/features/studies/types";

export const Route = createFileRoute("/app/curso/$courseId/")({
  component: CoursePage,
});

function CoursePage() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const overview = useCourseOverview(courseId);

  const [organizing, setOrganizing] = useState(false);
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [courseDeleteOpen, setCourseDeleteOpen] = useState(false);
  const [moduleFormOpen, setModuleFormOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | undefined>();
  const [deletingModule, setDeletingModule] = useState<CourseModule | null>(null);
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [lessonFormModuleId, setLessonFormModuleId] = useState<string | undefined>();
  const [editingLesson, setEditingLesson] = useState<Lesson | undefined>();
  const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const {
    course,
    modules,
    lessons,
    archivedModules,
    archivedLessons,
    hasModules,
    progress,
    continueTarget,
    isLoading: overviewLoading,
    isError,
  } = overview;

  const areaId = course?.study_area_id ?? "";

  // Escrita livre — mesma estrutura da aula (lesson_documents), ancorada em
  // courseId. Nunca gera Lesson, progresso, FSRS ou entra no cálculo acima.
  const freeWritingDoc = useLessonDocument({ courseId });
  const hasFreeWriting = !!freeWritingDoc.data;
  const isLoading = overviewLoading || freeWritingDoc.isLoading;

  const reorderModules = useReorderCourseModules(courseId);
  const toggleFavorite = useToggleCourseFavorite(areaId);
  const archiveCourse = useArchiveCourse(areaId);
  const restoreCourse = useRestoreCourse(areaId);
  const archiveModule = useArchiveCourseModule(courseId);
  const restoreModule = useRestoreCourseModule(courseId);
  const archiveLesson = useArchiveLesson(undefined, courseId);
  const restoreLesson = useRestoreLesson(undefined, courseId);

  const singleModuleId = modules[0]?.module.id;

  /** Total de aulas por módulo (ativas + arquivadas) — usado só para a confirmação de exclusão. */
  const lessonCountByModule = useMemo(() => {
    const map = new Map<string, number>();
    for (const view of lessons) {
      map.set(view.lesson.module_id, (map.get(view.lesson.module_id) ?? 0) + 1);
    }
    for (const lesson of archivedLessons) {
      map.set(lesson.module_id, (map.get(lesson.module_id) ?? 0) + 1);
    }
    return map;
  }, [lessons, archivedLessons]);

  const openLesson = useMemo(
    () => (view: LessonView) => {
      if (!view.hasMaterial) {
        navigate({
          to: "/app/meus-estudos/$areaId/cursos/$courseId/modulos/$moduleId/aulas/$lessonId",
          params: {
            areaId,
            courseId,
            moduleId: view.lesson.module_id,
            lessonId: view.lesson.id,
          },
        });
        return;
      }
      if (view.state === "review_due") {
        navigate({ to: "/app/revisar" });
        return;
      }
      navigate({
        to: "/app/estudar",
        search: { method: "aprender", lessonId: view.lesson.id },
      });
    },
    [areaId, courseId, navigate],
  );

  function openCreateModule() {
    setEditingModule(undefined);
    setModuleFormOpen(true);
  }

  function openEditModule(courseModule: CourseModule) {
    setEditingModule(courseModule);
    setModuleFormOpen(true);
  }

  function openCreateLesson(moduleId: string | undefined) {
    setEditingLesson(undefined);
    setLessonFormModuleId(moduleId);
    setLessonFormOpen(true);
  }

  function openEditLesson(lesson: Lesson) {
    setEditingLesson(lesson);
    setLessonFormModuleId(lesson.module_id);
    setLessonFormOpen(true);
  }

  async function handleToggleFavorite() {
    if (!course) return;
    try {
      await toggleFavorite(course);
    } catch (err) {
      console.error("[toggleCourseFavorite]", err);
      toast.error("Não foi possível atualizar o favorito");
    }
  }

  async function handleArchiveCourse() {
    if (!course) return;
    try {
      await archiveCourse(course.id);
      toast.success("Curso arquivado", {
        description: "Ele sai das suas listas e recomendações. O histórico de estudo é mantido.",
      });
    } catch (err) {
      console.error("[archiveCourse]", err);
      toast.error("Não foi possível arquivar o curso");
    }
  }

  async function handleRestoreCourse() {
    if (!course) return;
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

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 px-4 md:px-0">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-56 w-full rounded-3xl" />
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold">Curso não encontrado</h1>
          <p className="text-sm text-muted-foreground">
            Este curso não existe ou não está disponível para a sua conta.
          </p>
          <Button asChild className="rounded-full">
            <Link to="/app/meus-estudos">Voltar para meus estudos</Link>
          </Button>
        </div>
      </div>
    );
  }

  const hasLessons = lessons.length > 0;
  const isEmpty = !hasLessons && !hasFreeWriting;
  const totalModuleCount = modules.length + archivedModules.length;
  const totalLessonCount = lessons.length + archivedLessons.length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24 px-4 md:px-0">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/app/meus-estudos">Cursos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{course.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* CURSO */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground">
            {course.name}
          </h1>
          {course.is_favorite ? (
            <Star
              className="h-5 w-5 shrink-0 fill-amber-500 text-amber-500"
              aria-label="Favorito"
            />
          ) : null}
          {course.is_archived ? <Badge variant="secondary">Arquivado</Badge> : null}
        </div>
        {course.description ? (
          <p className="text-base text-muted-foreground/70 font-medium max-w-2xl">
            {course.description}
          </p>
        ) : null}
        <p className="text-sm font-medium text-muted-foreground/60">
          {hasModules ? `${progress.moduleCount} módulos · ` : ""}
          {progress.lessonCount} {progress.lessonCount === 1 ? "aula" : "aulas"}
        </p>
      </header>

      {/* AÇÃO PRINCIPAL */}
      {hasLessons && continueTarget ? (
        <section className="space-y-3">
          <Button
            size="lg"
            className="h-12 w-full md:w-auto px-8 rounded-full bg-primary hover:bg-primary/90 font-bold"
            onClick={() => openLesson(continueTarget)}
          >
            Continuar estudando
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-sm text-muted-foreground/60 font-medium">
            {LESSON_STATE_LABELS[continueTarget.state]} · {continueTarget.lesson.title}
          </p>
        </section>
      ) : null}

      {/* PROGRESSO */}
      {hasLessons ? (
        <section className="space-y-2">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>
              {progress.completedCount} de {progress.lessonCount} aulas
            </span>
            <span className="text-muted-foreground">{progress.percent}% concluído</span>
          </div>
          <Progress value={progress.percent} className="h-2" />
        </section>
      ) : null}

      {/* ESCRITA LIVRE — sempre disponível, nunca vira aula; some do estado
          vazio (já coberta pelas duas opções abaixo) para não duplicar. */}
      {!isEmpty ? (
        <section>
          <Button
            variant="outline"
            asChild
            className="h-auto w-full justify-start gap-3 rounded-2xl p-4 sm:w-auto"
          >
            <Link to="/app/curso/$courseId/escrever" params={{ courseId }}>
              <PenLine className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="text-left">
                <span className="block font-bold tracking-tight">Escrita livre</span>
                <span className="block text-xs font-medium text-muted-foreground">
                  {hasFreeWriting ? "Continuar escrevendo" : "Começar a escrever"}
                </span>
              </span>
            </Link>
          </Button>
        </section>
      ) : null}

      {/* ESTRUTURA */}
      {isEmpty ? (
        <section className="rounded-[2rem] border border-border/40 bg-surface/20 p-8 md:p-10 text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-black tracking-tight">Curso sem conteúdo</h2>
            <p className="text-sm text-muted-foreground/70 font-medium">
              Organize em módulos e aulas, ou simplesmente comece a escrever.
            </p>
          </div>
          <div className="mx-auto grid max-w-md gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              className="h-auto flex-col items-start gap-1 rounded-2xl p-5 text-left"
              onClick={() => setOrganizing(true)}
            >
              <span className="flex items-center gap-2 font-black">
                <Settings2 className="h-4 w-4" aria-hidden /> Organizar curso
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                Adicionar módulo e aula
              </span>
            </Button>
            <Button
              variant="outline"
              asChild
              className="h-auto flex-col items-start gap-1 rounded-2xl p-5 text-left"
            >
              <Link to="/app/curso/$courseId/escrever" params={{ courseId }}>
                <span className="flex items-center gap-2 font-black">
                  <PenLine className="h-4 w-4" aria-hidden /> Escrever livremente
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  Começar a escrever
                </span>
              </Link>
            </Button>
          </div>
        </section>
      ) : !hasLessons ? null : hasModules ? (
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
            Módulos
          </h2>
          {modules.map((moduleView, index) => (
            <ModuleBlock
              key={moduleView.module.id}
              courseId={courseId}
              view={moduleView}
              expanded={expanded.has(moduleView.module.id)}
              organizing={organizing}
              onToggle={() =>
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(moduleView.module.id)) next.delete(moduleView.module.id);
                  else next.add(moduleView.module.id);
                  return next;
                })
              }
              onLessonClick={openLesson}
              onAddLesson={() => openCreateLesson(moduleView.module.id)}
              onEditModule={() => openEditModule(moduleView.module)}
              onArchiveModule={() => handleArchiveModule(moduleView.module)}
              onDeleteModule={() => setDeletingModule(moduleView.module)}
              onEditLesson={openEditLesson}
              onArchiveLesson={handleArchiveLesson}
              onDeleteLesson={(lesson) => setDeletingLesson(lesson)}
              canMoveUp={index > 0}
              canMoveDown={index < modules.length - 1}
              onMove={async (direction) => {
                const ids = modules.map((m) => m.module.id);
                try {
                  await reorderModules.mutateAsync(moveId(ids, index, direction));
                } catch (err) {
                  console.error("[reorderCourseModules]", err);
                  toast.error("Não foi possível reordenar os módulos");
                }
              }}
            />
          ))}
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
            Aulas
          </h2>
          <LessonList
            courseId={courseId}
            moduleId={singleModuleId!}
            lessons={lessons}
            organizing={organizing}
            onLessonClick={openLesson}
            onEditLesson={openEditLesson}
            onArchiveLesson={handleArchiveLesson}
            onDeleteLesson={(lesson) => setDeletingLesson(lesson)}
          />
          <Button
            variant="ghost"
            className="rounded-full font-bold text-muted-foreground"
            onClick={() => openCreateLesson(singleModuleId)}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Adicionar aula
          </Button>
        </section>
      )}

      {/* ORGANIZAÇÃO */}
      <section className="space-y-4 border-t border-border/40 pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={organizing ? "default" : "outline"}
            className="rounded-full font-bold"
            onClick={() => setOrganizing((v) => !v)}
          >
            <Settings2 className="mr-1.5 h-4 w-4" />
            {organizing ? "Concluir organização" : "Organizar curso"}
          </Button>
          {organizing ? (
            <>
              <Button variant="ghost" className="rounded-full font-bold" onClick={openCreateModule}>
                <Plus className="mr-1.5 h-4 w-4" /> Adicionar módulo
              </Button>
              <Button
                variant="ghost"
                className="rounded-full font-bold"
                onClick={() => setEditCourseOpen(true)}
              >
                <Pencil className="mr-1.5 h-4 w-4" /> Editar curso
              </Button>
              <Button
                variant="ghost"
                className="rounded-full font-bold"
                onClick={handleToggleFavorite}
              >
                <Star
                  className={cn(
                    "mr-1.5 h-4 w-4",
                    course.is_favorite && "fill-amber-500 text-amber-500",
                  )}
                />
                {course.is_favorite ? "Desfavoritar" : "Favoritar"}
              </Button>
              {course.is_archived ? (
                <Button
                  variant="ghost"
                  className="rounded-full font-bold"
                  onClick={handleRestoreCourse}
                >
                  <ArchiveRestore className="mr-1.5 h-4 w-4" /> Restaurar curso
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="rounded-full font-bold"
                  onClick={handleArchiveCourse}
                >
                  <Archive className="mr-1.5 h-4 w-4" /> Arquivar curso
                </Button>
              )}
              <Button
                variant="ghost"
                className="rounded-full font-bold text-destructive hover:text-destructive"
                onClick={() => setCourseDeleteOpen(true)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Excluir curso
              </Button>
            </>
          ) : null}
        </div>

        {organizing ? (
          <ArchivedSection
            modules={archivedModules}
            lessons={archivedLessons}
            onRestoreModule={handleRestoreModule}
            onDeleteModule={setDeletingModule}
            onRestoreLesson={handleRestoreLesson}
            onDeleteLesson={setDeletingLesson}
          />
        ) : null}
      </section>

      <CourseFormDialog
        open={editCourseOpen}
        onOpenChange={setEditCourseOpen}
        fixedAreaId={areaId}
        course={course}
      />
      <DeleteCourseDialog
        open={courseDeleteOpen}
        onOpenChange={setCourseDeleteOpen}
        course={course}
        moduleCount={totalModuleCount}
        lessonCount={totalLessonCount}
        onDeleted={() => navigate({ to: "/app/meus-estudos/$areaId", params: { areaId } })}
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
        lessonCount={deletingModule ? (lessonCountByModule.get(deletingModule.id) ?? 0) : 0}
      />
      {lessonFormModuleId ? (
        <LessonFormDialog
          open={lessonFormOpen}
          onOpenChange={setLessonFormOpen}
          fixedCourseId={courseId}
          fixedModuleId={lessonFormModuleId}
          lesson={editingLesson}
        />
      ) : (
        <CourseModuleFormDialog
          open={lessonFormOpen}
          onOpenChange={setLessonFormOpen}
          fixedCourseId={courseId}
        />
      )}
      <DeleteLessonDialog
        open={!!deletingLesson}
        onOpenChange={(open) => !open && setDeletingLesson(null)}
        lesson={deletingLesson}
      />
    </div>
  );
}

function ModuleBlock({
  courseId,
  view,
  expanded,
  organizing,
  onToggle,
  onLessonClick,
  onAddLesson,
  onEditModule,
  onArchiveModule,
  onDeleteModule,
  onEditLesson,
  onArchiveLesson,
  onDeleteLesson,
  canMoveUp,
  canMoveDown,
  onMove,
}: {
  courseId: string;
  view: ModuleView;
  expanded: boolean;
  organizing: boolean;
  onToggle: () => void;
  onLessonClick: (lesson: LessonView) => void;
  onAddLesson: () => void;
  onEditModule: () => void;
  onArchiveModule: () => void;
  onDeleteModule: () => void;
  onEditLesson: (lesson: Lesson) => void;
  onArchiveLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lesson: Lesson) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-surface/20 overflow-hidden">
      <div className="flex items-center gap-2 p-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-3 text-left"
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          )}
          <span className="flex-1">
            <span className="block font-bold tracking-tight">{view.module.name}</span>
            <span className="block text-xs font-medium text-muted-foreground/70">
              {view.progress.completedCount}/{view.progress.totalCount} aulas concluídas
            </span>
          </span>
        </button>
        {organizing ? (
          <div className="flex items-center gap-1">
            <ReorderButtons
              label={`módulo ${view.module.name}`}
              disabledUp={!canMoveUp}
              disabledDown={!canMoveDown}
              onMoveUp={() => onMove("up")}
              onMoveDown={() => onMove("down")}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={`Ações de ${view.module.name}`}
                >
                  <MoreVertical className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEditModule}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden /> Editar módulo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onArchiveModule}>
                  <Archive className="mr-2 h-4 w-4" aria-hidden /> Arquivar módulo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDeleteModule}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Excluir módulo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>

      {expanded ? (
        <div className="border-t border-border/40 p-3 space-y-2">
          <LessonList
            courseId={courseId}
            moduleId={view.module.id}
            lessons={view.lessons}
            organizing={organizing}
            onLessonClick={onLessonClick}
            onEditLesson={onEditLesson}
            onArchiveLesson={onArchiveLesson}
            onDeleteLesson={onDeleteLesson}
          />
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full font-bold text-muted-foreground"
            onClick={onAddLesson}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar aula
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function LessonList({
  courseId,
  moduleId,
  lessons,
  organizing,
  onLessonClick,
  onEditLesson,
  onArchiveLesson,
  onDeleteLesson,
}: {
  courseId: string;
  moduleId: string;
  lessons: LessonView[];
  organizing: boolean;
  onLessonClick: (lesson: LessonView) => void;
  onEditLesson: (lesson: Lesson) => void;
  onArchiveLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lesson: Lesson) => void;
}) {
  const reorderLessons = useReorderLessons(moduleId, courseId);

  if (lessons.length === 0) {
    return (
      <p className="px-3 py-4 text-sm text-muted-foreground/70">Nenhuma aula neste módulo ainda.</p>
    );
  }

  async function move(index: number, direction: "up" | "down") {
    const ids = lessons.map((l) => l.lesson.id);
    try {
      await reorderLessons.mutateAsync(moveId(ids, index, direction));
    } catch (err) {
      console.error("[reorderLessons]", err);
      toast.error("Não foi possível reordenar as aulas");
    }
  }

  return (
    <ul className="space-y-1.5">
      {lessons.map((view, index) => (
        <li key={view.lesson.id} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onLessonClick(view)}
            className="group flex flex-1 items-center gap-3 rounded-xl border border-border/40 bg-background/40 px-3 py-3 text-left transition-colors hover:border-primary/30"
          >
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="flex-1 min-w-0">
              <span className="block truncate font-semibold tracking-tight">
                {view.lesson.title}
              </span>
              <span
                className={cn(
                  "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold",
                  LESSON_STATE_CLASSES[view.state],
                )}
              >
                {LESSON_STATE_LABELS[view.state]}
              </span>
            </span>
            <span className="hidden shrink-0 text-xs font-bold text-primary sm:inline">
              {LESSON_STATE_CTA[view.state]}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </button>
          {organizing ? (
            <div className="flex items-center gap-1">
              <ReorderButtons
                label={`aula ${view.lesson.title}`}
                disabledUp={index === 0}
                disabledDown={index === lessons.length - 1}
                onMoveUp={() => move(index, "up")}
                onMoveDown={() => move(index, "down")}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={`Ações de ${view.lesson.title}`}
                  >
                    <MoreVertical className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEditLesson(view.lesson)}>
                    <Pencil className="mr-2 h-4 w-4" aria-hidden /> Editar aula
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onArchiveLesson(view.lesson)}>
                    <Archive className="mr-2 h-4 w-4" aria-hidden /> Arquivar aula
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeleteLesson(view.lesson)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Excluir aula
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Só existe dentro do modo Organizar — é a única forma de alcançar
 * "Restaurar" para módulos/aulas arquivados, já que a leitura normal do
 * curso (useCourseOverview) nunca os exibe.
 */
function ArchivedSection({
  modules,
  lessons,
  onRestoreModule,
  onDeleteModule,
  onRestoreLesson,
  onDeleteLesson,
}: {
  modules: CourseModule[];
  lessons: Lesson[];
  onRestoreModule: (courseModule: CourseModule) => void;
  onDeleteModule: (courseModule: CourseModule) => void;
  onRestoreLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lesson: Lesson) => void;
}) {
  if (modules.length === 0 && lessons.length === 0) return null;

  return (
    <div className="rounded-2xl border border-dashed border-border/40 p-4 space-y-3">
      <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
        Arquivados
      </h3>
      <ul className="space-y-1.5">
        {modules.map((courseModule) => (
          <li
            key={courseModule.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/40 px-3 py-2.5"
          >
            <span className="truncate text-sm font-semibold text-muted-foreground">
              {courseModule.name}{" "}
              <span className="font-normal text-xs text-muted-foreground/60">· módulo</span>
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full font-bold"
                onClick={() => onRestoreModule(courseModule)}
              >
                <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Restaurar
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                aria-label={`Excluir ${courseModule.name} permanentemente`}
                onClick={() => onDeleteModule(courseModule)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          </li>
        ))}
        {lessons.map((lesson) => (
          <li
            key={lesson.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/40 px-3 py-2.5"
          >
            <span className="truncate text-sm font-semibold text-muted-foreground">
              {lesson.title}{" "}
              <span className="font-normal text-xs text-muted-foreground/60">· aula</span>
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full font-bold"
                onClick={() => onRestoreLesson(lesson)}
              >
                <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Restaurar
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                aria-label={`Excluir ${lesson.title} permanentemente`}
                onClick={() => onDeleteLesson(lesson)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
