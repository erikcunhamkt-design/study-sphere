/**
 * Escrita livre do curso — mesma estrutura de escrita da aula
 * (ClientOnlyLessonEditor/LessonEditor/autosave/versionamento), apenas
 * ancorada em courseId em vez de lessonId (ver document-anchor.ts). Não
 * cria Lesson, não entra em progresso de aulas, FSRS ou Next Action.
 */
import { createFileRoute, Link } from "@tanstack/react-router";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, PenLine } from "lucide-react";
import { ClientOnlyLessonEditor } from "@/features/lesson-editor/client-only-lesson-editor";
import { useCourse } from "@/features/studies/hooks/use-courses";

export const Route = createFileRoute("/app/curso/$courseId/escrever")({
  // O caderno (BlockNote) não pode rodar no servidor — mesmo motivo da
  // rota de aula (/app/meus-estudos/.../aulas/$lessonId).
  ssr: false,
  component: CourseFreeWritingPage,
});

function CourseFreeWritingPage() {
  const { courseId } = Route.useParams();
  const { data: course, isLoading, isError } = useCourse(courseId);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 px-4 md:px-0">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-64 w-full rounded-xl" />
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

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-24 px-4 md:px-0">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/app/meus-estudos">Cursos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/app/curso/$courseId" params={{ courseId }}>
                {course.name}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Escrita livre</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <PenLine className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground">
              Escrita livre
            </h1>
            <p className="text-sm text-muted-foreground/70 font-medium">{course.name}</p>
          </div>
        </div>
        <Button asChild variant="ghost" className="rounded-full font-bold shrink-0">
          <Link to="/app/curso/$courseId" params={{ courseId }}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar ao curso
          </Link>
        </Button>
      </header>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-muted-foreground/60">
        <span>Selecione um texto para formatar</span>
        <span aria-hidden className="text-muted-foreground/30">
          ·
        </span>
        <span>
          Digite{" "}
          <kbd className="rounded border border-border/40 bg-surface/60 px-1.5 py-0.5 font-mono text-[10px]">
            /
          </kbd>{" "}
          para títulos, listas, imagens e mais
        </span>
      </p>

      <ClientOnlyLessonEditor courseId={courseId} />
    </div>
  );
}
