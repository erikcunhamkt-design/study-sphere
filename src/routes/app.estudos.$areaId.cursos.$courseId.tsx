import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Archive, ArchiveRestore, Layers, MoreVertical, Pencil, Star, Trash2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { CourseFormDialog } from "@/features/studies/components/course-form-dialog";
import { DeleteCourseDialog } from "@/features/studies/components/delete-course-dialog";
import {
  useArchiveCourse,
  useCourse,
  useRestoreCourse,
  useSetCourseStatus,
  useToggleCourseFavorite,
} from "@/features/studies/hooks/use-courses";
import { useStudyArea } from "@/features/studies/hooks/use-study-areas";
import type { CourseStatus } from "@/features/studies/types";
import {
  COURSE_STATUS_BADGE_VARIANT,
  COURSE_STATUS_LABELS,
  isCourseOutsideArea,
} from "@/features/studies/utils";

export const Route = createFileRoute("/app/estudos/$areaId/cursos/$courseId")({
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

  return <CourseContent course={course!} area={area!} areaId={areaId} />;
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
}: {
  course: NonNullable<ReturnType<typeof useCourse>["data"]>;
  area: NonNullable<ReturnType<typeof useStudyArea>["data"]>;
  areaId: string;
}) {
  const navigate = useNavigate();
  const toggleFavorite = useToggleCourseFavorite(areaId);
  const setStatus = useSetCourseStatus(areaId);
  const archiveCourse = useArchiveCourse(areaId);
  const restoreCourse = useRestoreCourse(areaId);

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const createdAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(course.created_at),
  );
  const updatedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(course.updated_at));

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

  async function handleArchive() {
    try {
      await archiveCourse(course.id);
      toast.success("Curso arquivado");
    } catch (err) {
      console.error("[archiveCourse]", err);
      toast.error("Não foi possível arquivar o curso");
    }
  }

  async function handleRestore() {
    try {
      await restoreCourse(course.id);
      toast.success("Curso restaurado");
    } catch (err) {
      console.error("[restoreCourse]", err);
      toast.error("Não foi possível restaurar o curso");
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
              <DropdownMenuItem onClick={() => setFormOpen(true)}>
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

      <div className="rounded-xl border border-dashed border-border bg-surface/40 px-6 py-10 text-center">
        <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Layers className="h-5 w-5" aria-hidden />
        </div>
        <h2 className="text-sm font-medium text-foreground">Estrutura do curso</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Módulos e aulas serão organizados aqui na próxima etapa.
        </p>
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" disabled>
            Adicionar módulo — disponível na próxima etapa
          </Button>
        </div>
      </div>

      <CourseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        fixedAreaId={areaId}
        course={course}
      />
      <DeleteCourseDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        course={course}
        onDeleted={() => navigate({ to: "/app/estudos/$areaId", params: { areaId } })}
      />
    </div>
  );
}
