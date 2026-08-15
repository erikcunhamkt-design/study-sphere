import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { Brain, ArrowRight, Clock, CheckCircle2 } from "lucide-react"
import { useDueReviews } from "@/features/study-sessions/hooks.due"
import { AppShell } from "@/components/layout/AppShell"
import { useState } from "react"
import { ReviewSession } from "@/features/study-sessions/components/review/ReviewSession"

export const Route = createFileRoute('/app/revisar')({
  component: RevisarPage,
})

function RevisarPage() {
  const { data: dueConcepts, isLoading } = useDueReviews(50)
  const [isReviewing, setIsReviewing] = useState(false)

  if (isReviewing) {
    return (
      <AppShell>
         <ReviewSession 
           concepts={dueConcepts || []} 
           onDone={() => setIsReviewing(false)} 
         />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-12 px-6 space-y-12">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10">
             <Brain className="w-3.5 h-3.5 text-primary" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Sistema de Memória</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic">Revisar</h1>
          <p className="text-muted-foreground font-medium">Recupere o que está pronto para voltar à memória.</p>
        </header>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : dueConcepts && dueConcepts.length > 0 ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-10 rounded-[2.5rem] bg-surface/40 border border-border/40 space-y-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="space-y-2 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Sua revisão de hoje</span>
                <h2 className="text-5xl font-black tracking-tighter italic">{dueConcepts.length} conceitos</h2>
                <div className="flex items-center gap-2 text-muted-foreground/60">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Estimativa: {Math.max(dueConcepts.length * 2, 5)} min</span>
                </div>
              </div>

              <Button 
                onClick={() => setIsReviewing(true)}
                className="h-16 px-12 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-[0_0_30px_-5px_rgba(217,0,110,0.3)] transition-all group relative z-10"
              >
                COMEÇAR REVISÃO <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="p-6 rounded-[2rem] bg-surface/20 border border-border/10 space-y-1">
                 <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Status</span>
                 <p className="text-lg font-black uppercase italic text-primary/80">Recuperação ativa</p>
               </div>
               <div className="p-6 rounded-[2rem] bg-surface/20 border border-border/10 space-y-1">
                 <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Motor</span>
                 <p className="text-lg font-black uppercase italic text-foreground/60">FSRS v4 Core</p>
               </div>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center space-y-8 animate-in fade-in duration-700">
             <div className="w-24 h-24 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500/40">
               <CheckCircle2 className="w-12 h-12" />
             </div>
             <div className="space-y-3">
               <h2 className="text-3xl font-black tracking-tight text-foreground uppercase italic">Tudo em dia</h2>
               <p className="text-muted-foreground font-medium max-w-sm mx-auto">
                 Você não tem nenhum conceito devido agora. Sua memória está consolidada.
               </p>
             </div>
             <Button asChild variant="outline" className="h-14 px-8 rounded-full border-border/40 font-black uppercase tracking-widest text-[10px]">
               <Link to="/app/biblioteca">Continuar estudando <ArrowRight className="ml-2 w-4 h-4" /></Link>
             </Button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
