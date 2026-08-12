import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div className="flex min-h-screen items-center justify-center p-8 bg-zinc-950 text-zinc-50 font-sans">
      <div className="max-w-2xl w-full space-y-8">
        <header className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            DominusApp <span className="text-[#d9006e]">StudyOS</span>
          </h1>
          <p className="text-zinc-400 text-lg sm:text-xl">
            Fundação técnica e visual do aplicativo de estudos.
          </p>
        </header>

        <section className="space-y-6">
          <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm space-y-4">
            <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#d9006e]" />
              Fase 08 — Corrigir links órfãos no topbar (build quebrado)
            </h2>
            <div className="space-y-4 text-zinc-400 leading-relaxed">
              <p>
                A reorganização removeu as rotas <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200">/app/flashcards</code> e <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200">/app/questoes</code>, mas o menu "Criar rapidamente" no topbar (<code className="text-zinc-300">src/components/layout/topbar.tsx</code>) ainda tinha links mortos que quebravam o typecheck.
              </p>
              
              <div className="space-y-2">
                <p className="font-medium text-zinc-300">Ações realizadas:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Removido DropdownMenuItem "Novo flashcard"</li>
                  <li>Removido DropdownMenuItem "Nova questão"</li>
                  <li>Limpeza de imports de ícones não utilizados (Layers, ListChecks)</li>
                  <li>Adicionado comentário sobre o retorno futuro na Biblioteca (Fase 08.x)</li>
                </ul>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
                  Build Validado
                </div>
                <div className="px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm">
                  Exit code: 0
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <footer className="text-zinc-500 text-sm">
          DominusApp &bull; Do estudo ao domínio.
        </footer>
      </div>
    </div>
  ),
});
