import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { Brain, ArrowRight, Clock, CheckCircle2, Sparkles, BookOpen, RefreshCcw } from "lucide-react"
import { useState } from "react"
import { ReviewSession } from "@/features/study-sessions/components/review/ReviewSession"
import { useReviewSemanticState } from "@/features/study-sessions/hooks.semantic"

export const Route = createFileRoute('/app/revisar')({
  component: RevisarPage,
})

function RevisarPage() {
  const { state, dueReviews, isLoading } = useReviewSemanticState()
  const [isReviewing, setIsReviewing] = useState(false)

  if (isReviewing) {
    return (
      <ReviewSession 
        concepts={dueReviews || []} 
        onDone={() => setIsReviewing(false)} 
      />
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 space-y-12">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10">
           <Brain className="w-3.5 h-3.5 text-primary" />
           <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">Sistema de Memória</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground">Revisar</h1>
        <p className="text-muted-foreground font-medium">Recupere o que está pronto para voltar à memória.</p>
      </header>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : state === "due" ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="p-10 rounded-[2.5rem] bg-surface/40 border border-border/40 space-y-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="space-y-2 relative z-10 text-left">
              <span className="text-[9px] font-bold uppercase tracking-widest text-primary/60">Sua revisão de hoje</span>
              <h2 className="text-5xl font-black tracking-tighter text-foreground">{dueReviews.length} conceitos</h2>
              <div className="flex items-center gap-2 text-muted-foreground/60">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Estimativa: {Math.max(dueReviews.length * 2, 5)} min</span>
              </div>
            </div>

            <Button 
              onClick={() => setIsReviewing(true)}
              className="h-14 px-10 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-base shadow-lg shadow-primary/10 transition-all group relative z-10"
            >
              COMEÇAR REVISÃO <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="p-6 rounded-[2rem] bg-surface/20 border border-border/10 space-y-1 text-left">
               <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Status</span>
               <p className="text-base font-bold uppercase text-primary/80">Recuperação ativa</p>
             </div>
             <div className="p-6 rounded-[2rem] bg-surface/20 border border-border/10 space-y-1 text-left">
               <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Motor</span>
               <p className="text-base font-bold uppercase text-foreground/60">FSRS v4 Core</p>
             </div>
          </div>
        </div>
      ) : state === "new_user" ? (
        <div className="py-16 text-center space-y-8 animate-in fade-in duration-700">
           <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
             <BookOpen className="w-8 h-8" />
           </div>
           <div className="space-y-3">
             <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground uppercase">Comece sua memória</h2>
             <p className="text-muted-foreground font-medium max-w-sm mx-auto">
               Estude um conteúdo e faça sua primeira recuperação para começar a construir seu histórico de memória.
             </p>
           </div>
            <Button asChild className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-primary/10">
             <Link to="/app/biblioteca" search={{ tab: 'materials' }}>Começar estudo <ArrowRight className="ml-2 w-4 h-4" /></Link>
           </Button>
        </div>
      ) : state === "no_recovery" ? (
        <div className="py-16 text-center space-y-8 animate-in fade-in duration-700">
           <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
             <RefreshCcw className="w-8 h-8" />
           </div>
           <div className="space-y-3">
             <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground uppercase">Sua memória ainda não foi avaliada</h2>
             <p className="text-muted-foreground font-medium max-w-sm mx-auto">
               O próximo passo é descobrir o que realmente ficou. Você já estudou, mas ainda não testou o que consegue recuperar.
             </p>
           </div>
           <Button asChild className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-primary/10">
             <Link to="/app/estudar" search={{}}>Testar memória <ArrowRight className="ml-2 w-4 h-4" /></Link>
           </Button>
        </div>
      ) : (
        <div className="py-16 text-center space-y-8 animate-in fade-in duration-700">
           <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500">
             <CheckCircle2 className="w-8 h-8" />
           </div>
           <div className="space-y-3">
             <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground uppercase">Tudo em dia</h2>
             <p className="text-muted-foreground font-medium max-w-sm mx-auto">
               Nenhuma revisão está prevista para agora. Continue estudando e o Dominus indicará quando um conceito estiver pronto para ser recuperado novamente.
             </p>
           </div>
           <Button asChild variant="outline" className="h-12 px-8 rounded-full border-border/40 font-bold uppercase tracking-widest text-[10px] transition-all text-muted-foreground/60 hover:text-foreground">
             <Link to="/app/biblioteca" search={{ tab: 'materials' }}>Continuar estudando <ArrowRight className="ml-2 w-4 h-4" /></Link>
           </Button>
        </div>
      )}
    </div>
  )
}
