import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Brain, ArrowRight, ShieldCheck, Zap, Sparkles, BookOpen, GraduationCap, Github } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Header } from '@/components/layout/Header'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-magenta/30 selection:text-magenta-foreground overflow-x-hidden">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-magenta/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-magenta/10 blur-[100px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/40 border border-white/5 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Sparkles className="w-3.5 h-3.5 text-magenta" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-magenta/80">O Novo Padrão de Estudo</span>
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] italic animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            DO ESTUDO AO<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-magenta via-magenta/80 to-magenta/40">DOMÍNIO.</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground font-medium mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
            Pare de apenas coletar informações. O DominusApp é o sistema operacional da sua mente, projetado para transformar esforço em maestria real.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-700">
            <Button asChild size="lg" className="h-16 px-10 rounded-full bg-magenta hover:bg-magenta/90 text-white font-black text-lg shadow-[0_0_40px_-10px_rgba(217,0,110,0.5)] group transition-all">
              <Link to={user ? "/app" : "/cadastro"}>
                {user ? "ACESSAR MEU COCKPIT" : "COMEÇAR AGORA"}
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-16 px-8 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 font-black uppercase tracking-widest text-[10px]">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <Github className="mr-2 w-4 h-4" /> Ver no Github
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 border-t border-white/5 bg-gradient-to-b from-transparent to-surface/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-magenta" />}
              title="MOTOR DE MEMÓRIA"
              description="Algoritmos de ponta (FSRS v4) que preveem o seu esquecimento e otimizam suas revisões no tempo exato."
            />
            <FeatureCard 
              icon={<Brain className="w-6 h-6 text-magenta" />}
              title="RECUPERAÇÃO ATIVA"
              description="A ciência da aprendizagem aplicada. Teste sua mente, não apenas seus olhos, com o nosso motor de evidência."
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-6 h-6 text-magenta" />}
              title="DOMÍNIO REAL"
              description="Saia do ciclo de placeholders e conteúdos superficiais. Aprenda, compreenda e domine cada conceito."
            />
          </div>
        </div>
      </section>

      {/* Social Proof / Trust */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-7xl mx-auto opacity-50 grayscale">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-12">Potencializando Mentes em</p>
          <div className="flex flex-wrap justify-center gap-12 md:gap-24 items-center">
            <div className="text-2xl font-black tracking-tighter italic">TECH CORP</div>
            <div className="text-2xl font-black tracking-tighter italic">ED-X</div>
            <div className="text-2xl font-black tracking-tighter italic">NEUROLAB</div>
            <div className="text-2xl font-black tracking-tighter italic">VOID.IO</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto bg-surface/30 border border-white/5 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-magenta/5 blur-3xl rounded-full translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-6 italic relative z-10">
            PRONTO PARA O DOMÍNIO?
          </h2>
          <p className="text-muted-foreground font-medium mb-10 text-lg relative z-10">
            O seu tempo é limitado. Não o desperdice com métodos de estudo que não funcionam.
          </p>
          <Button asChild size="lg" className="h-16 px-12 rounded-full bg-magenta hover:bg-magenta/90 text-white font-black text-lg shadow-[0_0_40px_-10px_rgba(217,0,110,0.5)] relative z-10">
            <Link to={user ? "/app" : "/cadastro"}>
              CRIAR MINHA CONTA GRÁTIS
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-center">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-magenta flex items-center justify-center font-black italic text-white text-xs">D</div>
            <span className="font-black tracking-tighter italic text-sm">DOMINUSAPP</span>
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            © 2026 DOMINUSAPP. DO ESTUDO AO DOMÍNIO.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Termos</a>
            <a href="#" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group p-8 rounded-[2.5rem] bg-surface/20 border border-white/5 hover:border-magenta/20 hover:bg-surface/40 transition-all duration-500 hover:-translate-y-2">
      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-magenta/10 transition-all duration-500">
        {icon}
      </div>
      <h3 className="text-sm font-black tracking-widest uppercase mb-4 italic text-foreground/90">{title}</h3>
      <p className="text-sm text-muted-foreground font-medium leading-relaxed">
        {description}
      </p>
    </div>
  )
}
