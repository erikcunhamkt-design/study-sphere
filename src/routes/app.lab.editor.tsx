import { createFileRoute } from "@tanstack/react-router";

import { ClientOnlyLabEditor } from "@/features/lab-editor/client-only-editor";

export const Route = createFileRoute("/app/lab/editor")({
  // Mesmo motivo do BlockNote em si: nada aqui pode rodar no servidor.
  ssr: false,
  component: LabEditorRoute,
});

/**
 * Laboratório interno (Fase 03.0) — prova técnica do motor de editor em
 * blocos. Não é uma função oficial do produto: sem link na sidebar, sem
 * entrada na criação rápida, não substitui o empty-state real da aula.
 * Só existe em desenvolvimento (`import.meta.env.DEV`); qualquer build
 * de produção mostra "recurso não encontrado" abaixo, sem carregar o
 * BlockNote.
 */
function LabEditorRoute() {
  if (!import.meta.env.DEV) {
    return <LabNotAvailable />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
        Laboratório interno — prova técnica do motor de editor (Fase 03.0). Conteúdo local, nunca
        salvo. Não é uma função oficial do StudyOS.
      </div>
      <ClientOnlyLabEditor />
    </div>
  );
}

function LabNotAvailable() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Recurso não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta página não existe ou não está disponível.
        </p>
      </div>
    </div>
  );
}
