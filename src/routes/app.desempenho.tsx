import { createFileRoute } from '@tanstack/react-router';
import { PerformanceDashboard } from '@/features/performance/components/PerformanceDashboard';

export const Route = createFileRoute('/app/desempenho')({
  head: () => ({
    title: 'Desempenho | DominusApp',
    meta: [
      {
        name: 'description',
        content: 'Análise cognitiva da sua memória. Entenda o que você está aprendendo e onde precisa prestar atenção.',
      },
    ],
  }),
  component: DesempenhoPage,
});

function DesempenhoPage() {
  return (
    <div className="max-w-7xl mx-auto py-12 px-6 space-y-8">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10">
           <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">Análise Cognitiva</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground">Desempenho</h1>
        <p className="text-muted-foreground font-medium max-w-2xl">
          Entenda o que você está aprendendo, seu histórico de recuperações e onde precisa prestar atenção para otimizar sua memória.
        </p>
      </header>

      <PerformanceDashboard />
    </div>
  );
}
