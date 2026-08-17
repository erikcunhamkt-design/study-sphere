import { lazy, Suspense, useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mesma estratégia client-only da Fase 03.0 (ver
 * src/features/lab-editor/client-only-editor.tsx): a rota já é `ssr: false`,
 * e este componente só monta o editor depois de confirmar que está no
 * cliente (useEffect nunca roda em SSR) — duas camadas independentes.
 * BlockNote carregado via lazy(), fora do bundle principal da rota da aula.
 */
const LessonEditor = lazy(() =>
  import("./lesson-editor").then((m) => ({ default: m.LessonEditor })),
);

function EditorLoadingState() {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

type ClientOnlyLessonEditorProps = { lessonId: string } | { courseId: string };

export function ClientOnlyLessonEditor(props: ClientOnlyLessonEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <EditorLoadingState />;
  }

  const anchor = "lessonId" in props ? { lessonId: props.lessonId } : { courseId: props.courseId };

  return (
    <Suspense fallback={<EditorLoadingState />}>
      <LessonEditor anchor={anchor} />
    </Suspense>
  );
}
