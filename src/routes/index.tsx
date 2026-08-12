import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div className="flex min-h-screen items-center justify-center p-8 bg-zinc-950 text-zinc-50 font-sans">
      <div className="max-w-3xl w-full space-y-8">
        <header className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Dominus<span className="text-[#d9006e]">App</span>
          </h1>
          <p className="text-zinc-400 text-lg sm:text-xl italic">
            "Do estudo ao domínio."
          </p>
        </header>

        <section className="space-y-6">
          <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-md space-y-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4">
              <span className="px-3 py-1 rounded-full bg-[#d9006e]/10 border border-[#d9006e]/20 text-[#d9006e] text-xs font-bold uppercase tracking-widest">
                Fase 08 — FECHADA
              </span>
            </div>

            <h2 className="text-2xl font-bold text-zinc-100 border-b border-zinc-800 pb-4">
              Praticar vs. Gerenciar
            </h2>
            
            <div className="space-y-6 text-zinc-300 leading-relaxed">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-zinc-100">O que mudou</h3>
                <p className="text-zinc-400">Reorganização de arquitetura de informação por INTENÇÃO:</p>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <span className="text-[#d9006e] font-bold">PRATICAR:</span>
                    <span>Concentrado em "Estudar". Recordação Ativa agora roda ReviewSession (flashcards) e ExamAttemptRunner (questões) <span className="text-zinc-100 font-medium">INLINE</span>, sem troca de tela.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#d9006e] font-bold">GERENCIAR:</span>
                    <span>Conteúdo movido para dentro da aula (lesson-editor), onde flashcards/questões vivem vinculados ao ID da aula.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#d9006e] font-bold">MENU:</span>
                    <span>Rotas avulsas removidas. Navegação encurtada para 6 itens essenciais.</span>
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800">
                  <p className="text-sm font-bold text-green-500 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    QA VALIDADO
                  </p>
                  <ul className="text-xs space-y-2 text-zinc-400">
                    <li>• Ciclo SM-2 completo gravando no banco</li>
                    <li>• Sem links mortos ou rotas órfãs</li>
                    <li>• Build e Typecheck aprovados</li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800">
                  <p className="text-sm font-bold text-amber-500 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    DÍVIDA TÉCNICA
                  </p>
                  <ul className="text-xs space-y-2 text-zinc-400">
                    <li>• Criação avulsa (lesson_id null) na Biblioteca</li>
                    <li>• Refinar UX de gestão dentro do editor</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#d9006e]/5 border border-[#d9006e]/10 text-xs text-zinc-500 italic">
                <p className="font-semibold text-zinc-400 not-italic mb-1">Ressalva de Processo:</p>
                Esta fase pulou os gates de aprovação de código. O resultado foi validado via QA, mas o plano (docs/PLANO_FASE_08.md) deve ser seguido rigorosamente nas próximas etapas.
              </div>
            </div>
          </div>
        </section>
        
        <footer className="text-zinc-600 text-xs flex justify-between items-center px-2">
          <span>DominusApp &bull; Do estudo ao domínio.</span>
          <span className="font-mono opacity-50">2026.08.12</span>
        </footer>
      </div>
    </div>
  ),
});