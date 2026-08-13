import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Circle,
  MoreVertical,
  Pencil,
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
import { Skeleton } from "@/components/ui/skeleton";
import { ClientOnlyLessonEditor } from "@/features/lesson-editor/client-only-lesson-editor";
import { DeleteLessonDialog } from "@/features/studies/components/delete-lesson-dialog";
import { LessonFormDialog } from "@/features/studies/components/lesson-form-dialog";
import { useCourseModule } from "@/features/studies/hooks/use-course-modules";
import { useCourse } from "@/features/studies/hooks/use-courses";
import {
  useArchiveLesson,
  useLesson,
  useRestoreLesson,
  useToggleLessonCompletion,
} from "@/features/studies/hooks/use-lessons";
import { useStudyArea } from "@/features/studies/hooks/use-study-areas";
import {
  isCourseOutsideArea,
  isLessonOutsideModule,
  isModuleOutsideCourse,
} from "@/features/studies/utils";

export const Route = createFileRoute(
  "/app/meus-estudos/$areaId/cursos/$courseId/modulos/$moduleId/aulas/$lessonId",
)({
  // O caderno da aula (BlockNote) não pode rodar no servidor — mesmo
  // motivo do /app/lab/editor (Fase 03.0): acessa window/document na
  // inicialização. Explícito aqui mesmo já herdando ssr:false de /app,
  // por segurança e clareza.
  ssr: false,
  component: LessonDetailPage,
});

function LessonDetailPage() {
  const { areaId, courseId, moduleId, lessonId } = Route.useParams();
  const { data: area, isLoading: areaLoading, isError: areaError } = useStudyArea(areaId);
  const { data: course, isLoading: courseLoading, isError: courseError } = useCourse(courseId);
  const {
    data: courseModule,
    isLoading: moduleLoading,
    isError: moduleError,
  } = useCourseModule(moduleId);
  const { data: lesson, isLoading: lessonLoading, isError: lessonError } = useLesson(lessonId);

  const isLoading = areaLoading || courseLoading || moduleLoading || lessonLoading;
  const notFound =
    !isLoading &&
    (areaError ||
      courseError ||
      moduleError ||
      lessonError ||
      !area ||
      !course ||
      !courseModule ||
      isCourseOutsideArea(course, areaId) ||
      isModuleOutsideCourse(courseModule, courseId) ||
      isLessonOutsideModule(lesson, moduleId));

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
    return <LessonNotFound areaId={areaId} courseId={courseId} moduleId={moduleId} />;
  }

  return (
    <LessonContent
      area={area!}
      course={course!}
      courseModule={courseModule!}
      lesson={lesson!}
      areaId={areaId}
      courseId={courseId}
      moduleId={moduleId}
    />
  );
}

function LessonNotFound({
  areaId,
  courseId,
  moduleId,
}: {
  areaId: string;
  courseId: string;
  moduleId: string;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Aula não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta aula não existe ou não está disponível para a sua conta.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link
              to="/app/meus-estudos/$areaId/cursos/$courseId/modulos/$moduleId"
              params={{ areaId, courseId, moduleId }}
            >
              Voltar para o módulo
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function LessonContent({
  area,
  course,
  courseModule,
  lesson,
  areaId,
  courseId,
  moduleId,
}: {
  area: NonNullable<ReturnType<typeof useStudyArea>["data"]>;
  course: NonNullable<ReturnType<typeof useCourse>["data"]>;
  courseModule: NonNullable<ReturnType<typeof useCourseModule>["data"]>;
  lesson: NonNullable<ReturnType<typeof useLesson>["data"]>;
  areaId: string;
  courseId: string;
  moduleId: string;
}) {
  const navigate = useNavigate();
  const toggleCompletion = useToggleLessonCompletion(moduleId, courseId);
  const archiveLesson = useArchiveLesson(moduleId, courseId);
  const restoreLesson = useRestoreLesson(moduleId, courseId);

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const createdAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(lesson.created_at),
  );
  const updatedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(lesson.updated_at));

  async function handleToggleCompletion() {
    try {
      await toggleCompletion(lesson);
    } catch (err) {
      console.error("[toggleLessonCompletion]", err);
      toast.error("Não foi possível atualizar a conclusão da aula");
    }
  }

  async function handleArchive() {
    try {
      await archiveLesson(lesson.id);
      toast.success("Aula arquivada");
    } catch (err) {
      console.error("[archiveLesson]", err);
      toast.error("Não foi possível arquivar a aula");
    }
  }

  async function handleRestore() {
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
              <Link to="/app/meus-estudos">Estudos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/app/meus-estudos/$areaId" params={{ areaId }}>
                {area.name}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/app/meus-estudos/$areaId/cursos/$courseId" params={{ areaId, courseId }}>
                {course.name}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link
                to="/app/meus-estudos/$areaId/cursos/$courseId/modulos/$moduleId"
                params={{ areaId, courseId, moduleId }}
              >
                {courseModule.name}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{lesson.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {lesson.title}
            </h1>
            <Badge variant={lesson.is_completed ? "outline" : "secondary"}>
              {lesson.is_completed ? "Concluída" : "Pendente"}
            </Badge>
            {lesson.is_archived ? <Badge variant="secondary">Arquivada</Badge> : null}
          </div>
          {lesson.description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">{lesson.description}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Curso:{" "}
            <Link
              to="/app/meus-estudos/$areaId/cursos/$courseId"
              params={{ areaId, courseId }}
              className="underline hover:text-foreground"
            >
              {course.name}
            </Link>{" "}
            · Módulo:{" "}
            <Link
              to="/app/meus-estudos/$areaId/cursos/$courseId/modulos/$moduleId"
              params={{ areaId, courseId, moduleId }}
              className="underline hover:text-foreground"
            >
              {courseModule.name}
            </Link>{" "}
            · Criada em {createdAt} · Atualizada em {updatedAt}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={lesson.is_completed ? "outline" : "default"}
            onClick={handleToggleCompletion}
          >
            {lesson.is_completed ? (
              <>
                <Circle className="mr-2 h-4 w-4" aria-hidden /> Desmarcar conclusão
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden /> Marcar como concluída
              </>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Ações da aula">
                <MoreVertical className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFormOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" aria-hidden /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {lesson.is_archived ? (
                <DropdownMenuItem onClick={handleRestore}>
                  <ArchiveRestore className="mr-2 h-4 w-4" aria-hidden /> Restaurar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="mr-2 h-4 w-4" aria-hidden /> Arquivar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Excluir permanentemente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ClientOnlyLessonEditor lessonId={lesson.id} />

      <LessonFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        fixedCourseId={courseId}
        fixedModuleId={moduleId}
        lesson={lesson}
      />
      <DeleteLessonDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        lesson={lesson}
        onDeleted={() =>
          navigate({
            to: "/app/meus-estudos/$areaId/cursos/$courseId/modulos/$moduleId",
            params: { areaId, courseId, moduleId },
          })
        }
      />
    </div>
  );
}
