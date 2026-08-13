import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/lib/app-config";
import { 
  BookOpen, 
  Layers, 
  ListChecks, 
  Zap, 
  Calendar, 
  ArrowRight 
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
              className="w-12 h-12 md:w-16 md:h-16 object-contain"
            />
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              Dominus<span className="text-primary">App</span>
            </h1>
          </div>

          <h2 className="text-4xl md:text-7xl font-extrabold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            Do estudo ao <span className="text-primary">domínio</span>.
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            {APP_CONFIG.description}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
            <Button size="lg" className="h-12 px-8 text-base font-semibold w-full sm:w-auto" asChild>
              <Link to="/cadastro">
                Começar agora <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base font-semibold w-full sm:w-auto" asChild>
              <Link to="/login">
                Já tenho conta
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <main className="container mx-auto px-4 py-20 md:py-32">
        <div className="text-center mb-16">
          <h3 className="text-2xl md:text-4xl font-bold tracking-tight mb-4">
            Tudo o que você precisa para evoluir
          </h3>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Uma plataforma completa projetada para transformar o aprendizado passivo em conhecimento consolidado.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard 
            icon={<BookOpen className="w-6 h-6" />}
            title="Áreas & Cursos"
            description="Organize o conhecimento em áreas, cursos, módulos e aulas de forma intuitiva."
          />
          <FeatureCard 
            icon={<Layers className="w-6 h-6" />}
            title="Flashcards"
            description="Memorize conteúdos complexos com repetição espaçada baseada no algoritmo SM-2."
          />
          <FeatureCard 
            icon={<ListChecks className="w-6 h-6" />}
            title="Questões & Simulados"
            description="Teste seu nível de conhecimento com bancos de questões e exames simulados."
          />
          <FeatureCard 
            icon={<Zap className="w-6 h-6" />}
            title="Revisão Ativa"
            description="Pratique o que está devido hoje em um único fluxo de recordação ativa."
          />
          <FeatureCard 
            icon={<Calendar className="w-6 h-6" />}
            title="Planejamento"
            description="Agenda de estudos com calendário integrado e metas diárias personalizadas."
          />
          <div className="p-8 rounded-3xl border border-primary/20 bg-primary/5 flex flex-col justify-center items-center text-center">
            <p className="text-sm font-bold text-primary uppercase tracking-widest mb-2">Em breve</p>
            <h4 className="text-xl font-bold mb-2">E muito mais</h4>
            <p className="text-xs text-muted-foreground">Estatísticas avançadas, biblioteca integrada e gestão de tempo.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4 opacity-70">
            <img src="/logo-dominus.png" alt="" className="w-6 h-6" />
            <span className="font-semibold text-sm">DominusApp</span>
          </div>
          <p className="text-sm text-muted-foreground">
            DominusApp &bull; Do estudo ao domínio. &bull; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-3xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors group">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h4 className="text-xl font-bold mb-3">{title}</h4>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}
