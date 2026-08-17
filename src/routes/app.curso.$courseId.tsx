/**
 * CURSO V1 — entender → continuar → organizar.
 *
 * Representação única de um curso: estrutura real, estado real das aulas
 * e entrada direta nas experiências já existentes (Aprender / Revisar /
 * Editor). A organização é uma camada secundária, nunca o modo padrão.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  FileText,
  Pencil,
  Plus,
  Settings2,
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CourseFormDialog } from "@/features/studies/components/course-form-dialog";
import { CourseModuleFormDialog } from "@/features/studies/components/course-module-form-dialog";
import { LessonFormDialog } from "@/features/studies/components/lesson-form-dialog";
import { moveId } from "@/features/studies/components/reorder-buttons";
import { useReorderCourseModules } from "@/features/studies/hooks/use-course-modules";
import { useReorderLessons } from "@/features/studies/hooks/use-lessons";
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

export const Route = createFileRoute("/app/curso/$courseId")({
  component: CoursePage,
});

function CoursePage() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const overview = useCourseOverview(courseId);

  const [organizing, setOrganizing] = useState(false);
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [moduleFormOpen, setModuleFormOpen] = useState(false);
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [lessonFormModuleId, setLessonFormModuleId] = useState<string | undefined>();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const reorderModules = useReorderCourseModules(courseId);

  const { course, modules, lessons, hasModules, progress, continueTarget, isLoading, isError } =
    overview;

  const areaId = course?.study_area_id ?? "";

  const singleModuleId = modules[0]?.module.id;

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

  const isEmpty = lessons.length === 0;

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
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground">
          {course.name}
        </h1>
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
      {!isEmpty && continueTarget ? (
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
      {!isEmpty ? (
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

      {/* ESTRUTURA */}
      {isEmpty ? (
        <section className="rounded-[2rem] border border-border/40 bg-surface/20 p-8 md:p-10 text-center space-y-4">
          <h2 className="text-xl font-black tracking-tight">
            Seu curso está pronto para ser estruturado
          </h2>
          <p className="text-sm text-muted-foreground/70 font-medium">
            Adicione sua primeira aula ou comece pelo conteúdo inicial.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              className="rounded-full font-bold"
              onClick={() => {
                setLessonFormModuleId(singleModuleId);
                setLessonFormOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Adicionar aula
            </Button>
            <Button
              variant="outline"
              className="rounded-full font-bold"
              onClick={() => setOrganizing(true)}
            >
              <Settings2 className="mr-1.5 h-4 w-4" /> Organizar curso
            </Button>
          </div>
        </section>
      ) : hasModules ? (
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
              onAddLesson={() => {
                setLessonFormModuleId(moduleView.module.id);
                setLessonFormOpen(true);
              }}
              canMoveUp={index > 0}
              canMoveDown={index < modules.length - 1}
              onMove={async (direction) => {
                const ids = modules.map((m) => m.module.id);
                try {
                  await reorderModules(moveId(ids, index, direction));
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
          />
          <Button
            variant="ghost"
            className="rounded-full font-bold text-muted-foreground"
            onClick={() => {
              setLessonFormModuleId(singleModuleId);
              setLessonFormOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Adicionar aula
          </Button>
        </section>
      )}

      {/* ORGANIZAÇÃO */}
      <section className="flex flex-wrap items-center gap-3 border-t border-border/40 pt-6">
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
            <Button
              variant="ghost"
              className="rounded-full font-bold"
              onClick={() => setModuleFormOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Adicionar módulo
            </Button>
            <Button
              variant="ghost"
              className="rounded-full font-bold"
              onClick={() => setEditCourseOpen(true)}
            >
              <Pencil className="mr-1.5 h-4 w-4" /> Editar curso
            </Button>
          </>
        ) : null}
      </section>

      <CourseFormDialog
        open={editCourseOpen}
        onOpenChange={setEditCourseOpen}
        course={course}
      />
      <CourseModuleFormDialog
        open={moduleFormOpen}
        onOpenChange={setModuleFormOpen}
        fixedCourseId={courseId}
      />
      {lessonFormModuleId ? (
        <LessonFormDialog
          open={lessonFormOpen}
          onOpenChange={setLessonFormOpen}
          fixedCourseId={courseId}
          fixedModuleId={lessonFormModuleId}
        />
      ) : (
        <CourseModuleFormDialog
          open={lessonFormOpen}
          onOpenChange={setLessonFormOpen}
          fixedCourseId={courseId}
        />
      )}
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
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={!canMoveUp}
              onClick={() => onMove("up")}
              aria-label={`Mover ${view.module.name} para cima`}
            >
              <ChevronDown className="h-3.5 w-3.5 rotate-180" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={!canMoveDown}
              onClick={() => onMove("down")}
              aria-label={`Mover ${view.module.name} para baixo`}
            >
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </Button>
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
}: {
  courseId: string;
  moduleId: string;
  lessons: LessonView[];
  organizing: boolean;
  onLessonClick: (lesson: LessonView) => void;
}) {
  const reorderLessons = useReorderLessons(moduleId, courseId);

  if (lessons.length === 0) {
    return (
      <p className="px-3 py-4 text-sm text-muted-foreground/70">
        Nenhuma aula neste módulo ainda.
      </p>
    );
  }

  async function move(index: number, direction: "up" | "down") {
    const ids = lessons.map((l) => l.lesson.id);
    try {
      await reorderLessons(moveId(ids, index, direction));
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
            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={index === 0}
                onClick={() => move(index, "up")}
                aria-label={`Mover ${view.lesson.title} para cima`}
              >
                <ChevronDown className="h-3.5 w-3.5 rotate-180" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={index === lessons.length - 1}
                onClick={() => move(index, "down")}
                aria-label={`Mover ${view.lesson.title} para baixo`}
              >
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
