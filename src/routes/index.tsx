import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Layers, 
  ListChecks, 
  Zap, 
  Calendar, 
  ArrowRight,
  ShieldAlert,
  Brain,
  History,
  Target
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      {/* Hero Section */}
      <header className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24 border-b border-border/40">
        {/* Subtle Magenta Glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px] -z-10" />

        <div className="container mx-auto px-4 text-center max-w-4xl">
          <div className="flex items-center justify-center gap-3 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <img 
              src="/logo-dominus.png" 
              alt="DominusApp Logo" 
              className="w-10 h-10 md:w-12 md:h-12 object-contain"
            />
            <span className="text-xl md:text-2xl font-bold tracking-tight">
              Dominus<span className="text-primary">App</span>
            </span>
          </div>

          <p className="text-xs md:text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-4 animate-in fade-in duration-1000">
            A VERDADE QUE NINGUÉM TE CONTOU SOBRE ESTUDAR
          </p>
          
          <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            Você não tem problema de esforço. Você tem um método que te faz <span className="text-primary">esquecer</span> tudo.
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 leading-relaxed">
            Horas estudando pra quê? Se em uma semana sumiu, você não aprendeu — você se distraiu com sensação de produtividade. O DominusApp existe pra acabar com isso: você aprende de verdade, lembra na hora que importa, e <span className="text-primary">domina</span> o conteúdo. Sem enrolação.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300 mb-6">
            <Button size="lg" className="h-14 px-10 text-base font-bold w-full sm:w-auto bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg shadow-primary/20" asChild>
              <Link to="/cadastro">
                Quero dominar agora <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-10 text-base font-bold w-full sm:w-auto rounded-full border-border/60 hover:bg-accent" asChild>
              <Link to="/login">
                Já tenho conta
              </Link>
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground/60 italic animate-in fade-in duration-1000 delay-500">
            Grátis pra começar. Enquanto você pensa, alguém já começou.
          </p>
        </div>
      </header>

      {/* "A DOR" Section */}
      <section className="py-24 bg-card/30 border-b border-border/40">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h3 className="text-3xl md:text-5xl font-bold mb-8 tracking-tight">
            Reler, sublinhar, resumir. E <span className="text-primary">esquecer</span> mesmo assim.
          </h3>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Chega de se enganar. Grifar página inteira não é estudar — é decorar a cor amarela. 
            Reler dez vezes não fixa nada — só te dá a ilusão de que sabe, até a prova provar que não. 
            Você não está sem tempo. Você está sem <span className="text-primary">sistema</span>. E cada dia sem um é conteúdo escorrendo pelo ralo.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <main className="container mx-auto px-4 py-24 md:py-32">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Isso não é mais um app de anotações. É um <span className="text-primary">sistema</span> pra você dominar.
          </h3>
          <p className="text-lg text-muted-foreground">
            Cada recurso ataca uma parte do problema. Nenhum está aqui pra enfeitar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Brain className="w-8 h-8" />}
            title="Esquecer deixa de ser uma opção"
            description="O app sabe a hora exata de te cobrar cada conteúdo — bem antes do seu cérebro apagar. Você revisa menos, lembra mais, e para de reaprender o que já viu."
          />
          <FeatureCard 
            icon={<Zap className="w-8 h-8" />}
            title="Você nunca mais trava sem saber por onde começar"
            description="Abriu o app? A fila do dia já está pronta. O que está devido, na sua frente, pronto pra praticar. Zero desculpa, zero paralisia."
          />
          <FeatureCard 
            icon={<ShieldAlert className="w-8 h-8" />}
            title="Descubra o que você NÃO sabe — antes da prova descobrir por você"
            description="Reler afaga o ego. Responder expõe a verdade. Questões e simulados que cavam seus buracos enquanto ainda dá tempo de tapar."
          />
          <FeatureCard 
            icon={<BookOpen className="w-8 h-8" />}
            title="Fim do caos de PDF perdido e caderno largado"
            description="Áreas, cursos, módulos, aulas — cada coisa no lugar, do jeito que o assunto se monta na sua cabeça. Ordem no lugar da bagunça."
          />
          <FeatureCard 
            icon={<Target className="w-8 h-8" />}
            title="Plano de verdade, não promessa de ano novo"
            description="Calendário, metas por dia, e o retrato honesto do que você fez e do que fugiu. Disciplina vira sistema — e sistema não depende de motivação."
          />
          <div className="p-10 rounded-[2.5rem] border border-primary/30 bg-primary/5 flex flex-col justify-center items-center text-center relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4">
               <span className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">Full Power</span>
             </div>
             <Zap className="w-10 h-10 text-primary mb-6 animate-pulse" />
             <h4 className="text-2xl font-bold mb-4">Foco no Domínio</h4>
             <p className="text-sm text-muted-foreground leading-relaxed">
               Toda a arquitetura do DominusApp foi desenhada para uma única coisa: que você nunca mais sinta que estudou em vão.
             </p>
          </div>
        </div>
      </main>

      {/* CTA Final */}
      <section className="py-24 bg-card/50 border-y border-border/40 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-[120px] -z-10" />
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h3 className="text-3xl md:text-5xl font-bold mb-8 tracking-tight">
            Daqui a 3 meses você vai ter <span className="text-primary">dominado</span> — ou vai estar recomeçando de novo.
          </h3>
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            A diferença não é talento nem tempo livre. É ter um sistema que faz cada hora contar, ou não ter. 
            Você já sabe onde o "vou começar segunda" te levou até hoje. Muda o jogo <span className="text-primary">agora</span> — depois é só desculpa.
          </p>
          <Button size="lg" className="h-16 px-12 text-lg font-bold bg-primary hover:bg-primary/90 text-white rounded-full shadow-xl shadow-primary/20" asChild>
            <Link to="/cadastro">
              Quero dominar agora <ArrowRight className="ml-2 w-6 h-6" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-border/10">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6 opacity-60">
            <img src="/logo-dominus.png" alt="" className="w-5 h-5 grayscale" />
            <span className="font-bold text-sm tracking-tight">Dominus<span className="text-primary">App</span></span>
          </div>
          <p className="text-xs text-muted-foreground/50 tracking-wide">
            DominusApp &bull; Do estudo ao domínio. &bull; 2026
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-10 rounded-[2.5rem] border border-border/40 bg-card/40 backdrop-blur-md hover:border-primary/40 transition-all duration-500 group hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-primary/5">
      <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner">
        {icon}
      </div>
      <h4 className="text-2xl font-bold mb-4 tracking-tight">{title}</h4>
      <p className="text-muted-foreground text-base leading-relaxed">
        {description}
      </p>
    </div>
  );
}