import { createFileRoute, Link } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle2, 
  Clock, 
  Layout, 
  Search, 
  Calendar, 
  ChevronRight,
  ArrowRight,
  Flame,
  Brain
} from 'lucide-react'
import { AppBrand } from '@/components/layout/app-brand'

export const Route = createFileRoute('/')({
  component: LandingPage,
  head: () => ({
    title: 'DominusApp — Do estudo ao domínio.',
    meta: [
      { name: 'description', content: 'Sistema de estudos premium para você dominar qualquer conteúdo. Aprenda de verdade, lembre na hora que importa.' },
      { property: 'og:title', content: 'DominusApp — Do estudo ao domínio.' },
      { property: 'og:description', content: 'Sistema de estudos premium para você dominar qualquer conteúdo.' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
})

function GrainOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[1] opacity-[0.02]" aria-hidden="true">
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>
    </div>
  )
}

function HeroGlow() {
  return (
    <motion.div 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none z-0"
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.5, 0.3],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      aria-hidden="true"
    />
  )
}

function ShimmerText({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="text-primary bg-clip-text">
        {children}
      </span>
      <motion.span 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent bg-[length:200%_100%] pointer-events-none mix-blend-overlay"
        animate={{
          backgroundPosition: ['100% 0%', '-100% 0%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
      >
        {children}
      </motion.span>
    </span>
  )
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) {
  const shouldReduceMotion = useReducedMotion()
  
  if (shouldReduceMotion) return <>{children}</>

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}

function FeatureCard({ icon: Icon, title, text, delay }: { icon: any, title: string, text: string, delay: number }) {
  return (
    <Reveal delay={delay}>
      <div className="group relative p-8 rounded-2xl bg-muted/30 border border-transparent transition-all duration-300 hover:border-primary hover:bg-muted/50 hover:-translate-y-1 hover:shadow-[0_0_30px_-10px_rgba(217,0,110,0.3)]">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{text}</p>
      </div>
    </Reveal>
  )
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white relative overflow-hidden font-sans">
      <GrainOverlay />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center backdrop-blur-md bg-background/50 border-b border-white/5">
        <AppBrand isCollapsed={false} className="!w-auto" />
        <div className="hidden sm:flex gap-4">
          <Button variant="ghost" asChild>
            <Link to="/login">Já tenho conta</Link>
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white" asChild>
            <Link to="/cadastro">Quero dominar agora</Link>
          </Button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-40 pb-20 px-6 max-w-7xl mx-auto text-center overflow-hidden">
          <HeroGlow />
          <Reveal>
            <div className="relative z-10">
              <p className="text-muted-foreground uppercase tracking-[0.3em] text-xs font-semibold mb-6">
                A VERDADE QUE NINGUÉM TE CONTOU SOBRE ESTUDAR
              </p>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-[1.1]">
                Você não tem problema de esforço.<br />
                Você tem um método que te faz <ShimmerText>esquecer tudo.</ShimmerText>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
                Horas estudando pra quê? Se em uma semana sumiu, você não aprendeu — se distraiu com sensação de produtividade. O DominusApp existe pra acabar com isso: você aprende de verdade, lembra na hora que importa, e domina o conteúdo. Sem enrolação.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                <Button size="lg" className="h-14 px-10 text-lg bg-primary hover:bg-primary/90 text-white w-full sm:w-auto" asChild>
                  <Link to="/cadastro">Quero dominar agora <ArrowRight className="ml-2 w-5 h-5" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-10 text-lg border-white/10 hover:bg-white/5 w-full sm:w-auto" asChild>
                  <Link to="/login">Já tenho conta</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Grátis pra começar. Enquanto você pensa, alguém já começou.
              </p>
            </div>
          </Reveal>
        </section>

        {/* Section: Dor */}
        <section className="py-24 px-6 max-w-5xl mx-auto text-center">
          <Reveal>
            <div className="p-12 rounded-[2.5rem] bg-muted/20 border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Flame className="w-32 h-32 text-primary" />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-8">Reler, sublinhar, resumir.<br />E esquecer mesmo assim.</h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Chega de se enganar. Grifar página inteira não é estudar — é decorar a cor amarela. Reler dez vezes não fixa nada — só te dá a ilusão de que sabe, até a prova provar que não. Você não está sem tempo. Você está <span className="text-primary font-bold">sem sistema</span>. E cada dia sem um é conteúdo escorrendo pelo ralo.
              </p>
            </div>
          </Reveal>
        </section>

        {/* Section: Recursos */}
        <section className="py-24 px-6 max-w-7xl mx-auto">
          <Reveal>
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Isso não é mais um app de anotações.<br />É um sistema pra você dominar.</h2>
              <p className="text-xl text-muted-foreground">Cada recurso ataca uma parte do problema. Nenhum está aqui pra enfeitar.</p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={Clock}
              title="Esquecer deixa de ser uma opção"
              text="O app sabe a hora exata de te cobrar cada conteúdo, bem antes do seu cérebro apagar. Revisa menos, lembra mais."
              delay={0.1}
            />
            <FeatureCard 
              icon={Brain}
              title="Você nunca mais trava sem saber por onde começar"
              text="Abriu o app? A fila do dia já está pronta. O que está devido, na sua frente, pronto pra praticar."
              delay={0.2}
            />
            <FeatureCard 
              icon={Search}
              title="Descubra o que você NÃO sabe"
              text="Reler afaga o ego. Responder expõe a verdade. Questões e simulados que cavam seus buracos a tempo."
              delay={0.3}
            />
            <FeatureCard 
              icon={Layout}
              title="Fim do caos de PDF perdido e caderno largado"
              text="Áreas, cursos, módulos e aulas, cada coisa no lugar, do jeito que o assunto se monta na sua cabeça."
              delay={0.4}
            />
            <FeatureCard 
              icon={Calendar}
              title="Plano de verdade, não promessa de ano novo"
              text="Calendário, metas por dia, e o retrato honesto do que você fez e do que fugiu. Sistema não depende de motivação."
              delay={0.5}
            />
          </div>
        </section>

        {/* Section: Fechamento */}
        <section className="py-32 px-6 max-w-5xl mx-auto text-center">
          <Reveal>
            <div className="relative">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-primary/20 rounded-full blur-2xl" />
              <h2 className="text-4xl md:text-6xl font-black mb-10 leading-tight">Daqui a 3 meses você vai ter dominado — ou vai estar recomeçando de novo.</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
                A diferença não é talento nem tempo livre. É ter um sistema que faz cada hora contar, ou não ter. Você já sabe onde o "vou começar segunda" te levou. Muda o jogo agora — depois é só desculpa.
              </p>
              <Button size="lg" className="h-16 px-12 text-xl bg-primary hover:bg-primary/90 text-white shadow-[0_0_40px_-10px_rgba(217,0,110,0.5)]" asChild>
                <Link to="/cadastro">Quero dominar agora <ArrowRight className="ml-3 w-6 h-6" /></Link>
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-center text-muted-foreground">
        <div className="flex justify-center items-center gap-2 mb-4">
          <span className="font-bold text-foreground">Dominus</span><span className="text-primary font-bold">App</span>
        </div>
        <p className="text-sm">Do estudo ao domínio. · 2026</p>
      </footer>
    </div>
  )
}
