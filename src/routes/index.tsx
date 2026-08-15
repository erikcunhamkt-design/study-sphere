import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Brain, ArrowRight, Sparkles, BookOpen, Layers, Target, Clock, RefreshCcw, CheckCircle2, Play } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { MarketingHeader } from '@/components/marketing/MarketingHeader'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/')({
  head: () => ({
    title: 'DominusApp - Do estudo ao domínio',
    meta: [
      {
        name: 'description',
        content: 'Transforme estudo em conhecimento real com o DominusApp. Use o motor FSRS v4 para consolidar sua memória através da recuperação ativa.',
      },
      {
        property: 'og:title',
        content: 'DominusApp - Do estudo ao domínio',
      },
      {
        property: 'og:description',
        content: 'O novo padrão de estudo baseado em ciência cognitiva e recuperação ativa.',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
    ],
  }),
  component: LandingPage,
})

function LandingPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) return null;


  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground overflow-x-hidden">
      <MarketingHeader />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-40 px-6">
        {/* Glow Effect - Muito sutil conforme regra 24 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">
          <div className="flex-1 text-center lg:text-left space-y-8 max-w-2xl mx-auto lg:mx-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/[0.03] border border-primary/10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <Sparkles className="w-3.5 h-3.5 text-primary/80" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">O Novo Padrão de Estudo</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.95] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              DO ESTUDO À<br />
              <span className="text-primary">MEMÓRIA.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground/70 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
              O Dominus transforma estudo em conhecimento que você consegue recuperar, aplicar e manter.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-700">
              <Button asChild size="lg" className="h-14 px-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-black tracking-widest text-[11px] uppercase shadow-lg shadow-primary/20 group transition-all hover:scale-[1.02] active:scale-[0.98]">
                <Link to={user ? "/app" : "/cadastro"}>
                  {user ? "Acessar meu cockpit" : "Começar gratuitamente"}
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Side - Mockup real (Simulado com componentes reais do app conforme regra 10) */}
          <div className="flex-1 w-full max-w-xl lg:max-w-none animate-in fade-in zoom-in duration-1000 delay-300">
             <div className="relative rounded-[2.5rem] border border-border/40 bg-surface/40 p-2 shadow-2xl overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                <div className="rounded-[2rem] border border-border/40 bg-background/50 overflow-hidden aspect-[4/3] flex flex-col">
                  {/* Mock Sidebar and Content */}
                  <div className="flex flex-1 overflow-hidden">
                    <div className="w-16 border-r border-border/40 p-4 space-y-4 bg-sidebar/50">
                      {[1,2,3,4,5].map(i => <div key={i} className="w-8 h-8 rounded-lg bg-surface/50 border border-border/20" />)}
                    </div>
                    <div className="flex-1 p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="h-4 w-32 bg-foreground/10 rounded-full" />
                          <div className="h-3 w-24 bg-foreground/5 rounded-full" />
                        </div>
                        <div className="w-8 h-8 rounded-full bg-primary/10" />
                      </div>
                      
                      {/* Fake Dashboard State */}
                      <div className="rounded-[1.5rem] border border-border/40 bg-gradient-to-br from-primary/[0.05] to-surface/40 p-6 space-y-4">
                        <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 w-fit">
                          <Play className="w-2.5 h-2.5 text-primary" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-primary">Retomar</span>
                        </div>
                        <div className="h-6 w-3/4 bg-foreground/10 rounded-full" />
                        <div className="h-10 w-32 bg-primary rounded-full" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-24 rounded-[1.5rem] border border-border/40 bg-surface/20 p-4 space-y-2">
                           <div className="h-2 w-16 bg-foreground/5 rounded-full" />
                           <div className="h-6 w-12 bg-foreground/10 rounded-full" />
                        </div>
                        <div className="h-24 rounded-[1.5rem] border border-border/40 bg-surface/20 p-4 space-y-2">
                           <div className="h-2 w-16 bg-foreground/5 rounded-full" />
                           <div className="h-6 w-20 bg-primary/20 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Seção Problema - Regra 12 */}
      <section className="py-24 px-6 border-t border-border/40 bg-surface/5">
        <div className="max-w-7xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground">
            Estudar não é o mesmo que lembrar.
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-muted-foreground/70 font-medium leading-relaxed">
            Você pode ler, assistir e revisar dezenas de vezes e ainda assim esquecer. O Dominus transforma o estudo em um processo de recuperação e consolidação.
          </p>
        </div>
      </section>

      {/* Seção Como Funciona - Regra 13 */}
      <section id="como-funciona" className="py-24 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ProcessCard 
              number="01"
              title="Aprender"
              description="Compreenda o conteúdo profundamente com foco editorial."
              icon={<BookOpen className="w-5 h-5" />}
            />
            <ProcessCard 
              number="02"
              title="Recuperar"
              description="Tente lembrar sem consultar o material. Teste sua mente."
              icon={<RefreshCcw className="w-5 h-5" />}
            />
            <ProcessCard 
              number="03"
              title="Avaliar"
              description="Compare sua resposta e reflita sobre seu desempenho real."
              icon={<Target className="w-5 h-5" />}
            />
            <ProcessCard 
              number="04"
              title="Consolidar"
              description="O Dominus usa seu histórico para definir quando recuperar novamente."
              icon={<CheckCircle2 className="w-5 h-5" />}
            />
          </div>
        </div>
      </section>

      {/* Seção Motor de Memória - Regra 14 & 15 */}
      <section id="metodo" className="py-24 px-6 border-y border-border/40 bg-surface/5 overflow-hidden relative">
        <div className="absolute inset-0 bg-primary/[0.02] pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">
          <div className="flex-1 space-y-8">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground leading-[1.1]">
              Sua memória também precisa de revisão.
            </h2>
            <div className="space-y-6 text-lg text-muted-foreground/70 font-medium leading-relaxed">
              <p>
                Cada recuperação gera uma evidência sobre aquele conceito. O Dominus usa esse histórico para estimar o estado da memória e determinar quando aquele conhecimento precisa voltar.
              </p>
              <p className="text-sm border-l-2 border-primary/20 pl-4">
                O Dominus utiliza um motor de repetição espaçada baseado em <span className="text-foreground font-bold">FSRS v4</span> para organizar futuras recuperações, garantindo retenção máxima com esforço mínimo.
              </p>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            {/* Conceito Central - Regra 16 */}
            <div className="p-12 rounded-[3rem] border border-border/40 bg-background/50 space-y-4 text-center min-w-[300px]">
              <div className="text-[10px] font-black tracking-[0.4em] text-primary/60 mb-8 uppercase">Fluxo de Domínio</div>
              <div className="space-y-2">
                <div className="px-6 py-3 rounded-xl border border-border/40 bg-surface/20 text-[10px] font-black tracking-[0.2em] uppercase">Aprender</div>
                <div className="text-muted-foreground/20">↓</div>
                <div className="px-6 py-3 rounded-xl border border-primary/20 bg-primary/5 text-[10px] font-black tracking-[0.2em] text-primary uppercase">Recuperar</div>
                <div className="text-muted-foreground/20">↓</div>
                <div className="px-6 py-3 rounded-xl border border-border/40 bg-surface/20 text-[10px] font-black tracking-[0.2em] uppercase">Memória</div>
                <div className="text-muted-foreground/20">↓</div>
                <div className="px-6 py-3 rounded-xl border border-border/40 bg-surface/20 text-[10px] font-black tracking-[0.2em] uppercase">Revisar</div>
                <div className="text-muted-foreground/20">↓</div>
                <div className="px-6 py-3 rounded-xl border border-border/40 bg-surface/20 text-[10px] font-black tracking-[0.2em] uppercase">Consolidar</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metacognição - Regra 17 */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
           <div className="inline-flex px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10 mb-4">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/60">Metacognição</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground uppercase">
            Você também aprende sobre o que sabe.
          </h2>
          <p className="text-lg text-muted-foreground/70 font-medium leading-relaxed">
             O Dominus separa o "eu acho que sei" do "eu consegui recuperar". Através da análise de <span className="text-foreground">resultado + confiança</span>, você identifica lacunas reais de conhecimento.
          </p>
        </div>
      </section>

      {/* Seção do Produto - Regra 21 */}
      <section className="py-24 px-6 border-t border-border/40">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground">
              Um fluxo, não um monte de ferramentas.
            </h2>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
             <div className="rounded-[2rem] border border-border/40 bg-surface/20 aspect-video overflow-hidden shadow-2xl relative group">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="p-8 h-full flex flex-col justify-end bg-gradient-to-t from-background/90 to-transparent">
                  <div className="space-y-2">
                    <h3 className="text-xl font-black tracking-tight">Cockpit Inteligente</h3>
                    <p className="text-sm text-muted-foreground font-medium">Prioridades dinâmicas que respondem "O que eu deveria fazer agora?"</p>
                  </div>
                </div>
             </div>
             <div className="space-y-12">
                <ProductFeature 
                  step="01"
                  title="Home"
                  description="Estado do sistema baseado em FSRS e sessões incompletas."
                />
                <ProductFeature 
                  step="02"
                  title="Estudar"
                  description="Ambiente focado para primeiro contato e aprendizado ativo."
                />
                <ProductFeature 
                  step="03"
                  title="Recuperar"
                  description="Evidência imutável de conhecimento capturada a cada tentativa."
                />
             </div>
          </div>
        </div>
      </section>

      {/* CTA Final - Regra 26 */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto rounded-[3rem] border border-border/40 bg-gradient-to-br from-primary/[0.05] via-surface/40 to-surface/90 p-12 md:p-20 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          
          <h2 className="text-3xl md:text-6xl font-black tracking-tighter mb-8 text-foreground leading-tight">
            Pronto para estudar diferente?
          </h2>
          <p className="text-muted-foreground/70 font-medium mb-12 text-lg md:text-xl">
            Comece a construir uma memória de verdade hoje mesmo.
          </p>
          <Button asChild size="lg" className="h-16 px-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-black tracking-widest text-[12px] uppercase shadow-xl shadow-primary/20 relative z-10 transition-all hover:scale-[1.05] active:scale-[0.98]">
            <Link to={user ? "/app" : "/cadastro"}>
              Começar gratuitamente →
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer - Regra 27 */}
      <footer className="py-16 px-6 border-t border-border/40 bg-surface/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 md:gap-6 text-center md:text-left">
          <div className="space-y-2">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center font-black italic text-primary-foreground text-xs">D</div>
              <span className="font-black tracking-tighter italic text-sm">DOMINUSAPP</span>
            </div>
            <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-[0.2em]">Do estudo ao domínio.</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <nav className="flex gap-8">
              <a href="#" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors">Termos</a>
              <a href="#" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors">Privacidade</a>
            </nav>
            <p className="text-[10px] font-bold text-muted-foreground/20 uppercase tracking-[0.2em]">
              © 2026 DOMINUSAPP.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ProcessCard({ number, title, description, icon }: { number: string, title: string, description: string, icon: React.ReactNode }) {
  return (
    <div className="group p-10 rounded-[2.5rem] bg-surface/20 border border-border/40 hover:border-primary/20 hover:bg-surface/40 transition-all duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-500">
          {icon}
        </div>
        <span className="text-[10px] font-black tracking-widest text-muted-foreground/20 uppercase">{number}</span>
      </div>
      <h3 className="text-lg font-black tracking-tight text-foreground mb-4 uppercase">{title}</h3>
      <p className="text-sm text-muted-foreground/60 font-medium leading-relaxed">
        {description}
      </p>
    </div>
  )
}

function ProductFeature({ step, title, description }: { step: string, title: string, description: string }) {
  return (
    <div className="flex items-start gap-6 group">
      <span className="text-[10px] font-black text-primary/40 mt-1">{step}</span>
      <div className="space-y-1">
        <h4 className="text-lg font-black tracking-tight text-foreground group-hover:text-primary transition-colors">{title}</h4>
        <p className="text-sm text-muted-foreground/60 font-medium leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
