import { lazy, Suspense, useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * BlockNote acessa `window`/`document` na inicialização (ProseMirror monta
 * direto no DOM) — não pode rodar durante SSR. Duas camadas de proteção,
 * cada uma suficiente sozinha, combinadas por segurança:
 *
 * 1. A rota (/app/lab/editor) já declara `ssr: false`.
 * 2. Este componente só renderiza o editor depois de montar no cliente
 *    (`useEffect` nunca roda em SSR) — funciona mesmo se algum dia for
 *    importado por engano num contexto com SSR habilitado.
 *
 * O bundle do BlockNote é carregado via `lazy()`, fora do bundle principal
 * do app — só baixado quando alguém realmente abre o laboratório.
 */
const BlockNoteLab = lazy(() =>
  import("./blocknote-lab").then((m) => ({ default: m.BlockNoteLab })),
);

function EditorLoadingState() {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function ClientOnlyLabEditor() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <EditorLoadingState />;
  }

  return (
    <Suspense fallback={<EditorLoadingState />}>
      <BlockNoteLab />
    </Suspense>
  );
}
