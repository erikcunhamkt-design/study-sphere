import { useMemo } from "react";
import { 
  Zap, 
  Brain, 
  ListChecks, 
  Clock, 
  ChevronRight,
  ArrowRight,
  Layers,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudyMethod } from "../types";
import { COURSE_STATUS_LABELS } from "@/features/studies/utils";

interface MethodOption {
  id: StudyMethod;
  title: string;
  description: string;
  recommendation?: string;
  icon: any;
  category: "tempo" | "aprendizagem" | "recuperacao" | "avaliacao";
}

const METHODS: MethodOption[] = [
  {
    id: "pomodoro",
    title: "Pomodoro",
    description: "Foco profundo com intervalos.",
    icon: Clock,
    category: "tempo"
  },
  {
    id: "feynman",
    title: "Feynman",
    description: "Explique o conceito com suas próprias palavras.",
    recommendation: "Você está começando este conteúdo agora. Tente explicar o que aprendeu para fixar.",
    icon: Brain,
    category: "aprendizagem"
  },
  {
    id: "cornell",
    title: "Cornell",
    description: "Estruture suas anotações com pistas e resumos.",
    icon: BookOpen,
    category: "aprendizagem"
  },
  {
    id: "blurting",
    title: "Blurting",
    description: "Escreva tudo o que lembra sem consultar o material.",
    recommendation: "Você já viu este conteúdo antes. Teste sua memória sem olhar as notas.",
    icon: Zap,
    category: "recuperacao"
  },
  {
    id: "recordacao_ativa",
    title: "Flashcards",
    description: "Repetição espaçada inteligente com cartões.",
    recommendation: "É hora de reforçar este conteúdo com revisões rápidas.",
    icon: Layers,
    category: "recuperacao"
  },
  {
    id: "livre",
    title: "Simulado",
    description: "Pratique com questões reais e avalie seu nível.",
    icon: ListChecks,
    category: "avaliacao"
  }
];

interface StudyMethodsHubProps {
  onSelectMethod: (method: StudyMethod) => void;
  selectedContent?: {
    id: string;
    name: string;
    status: string;
    type: 'course' | 'lesson';
  };
  className?: string;
}

export function StudyMethodsHub({ onSelectMethod, selectedContent, className }: StudyMethodsHubProps) {
  const categories = [
    { id: "tempo", label: "Gestão de Tempo", icon: Clock },
    { id: "aprendizagem", label: "Aprendizagem", icon: BookOpen },
    { id: "recuperacao", label: "Recuperação Ativa", icon: Brain },
    { id: "avaliacao", label: "Avaliação", icon: ListChecks },
  ];

  // Lógica simples de recomendação do Dominus
  const recommendedMethodId = useMemo(() => {
    if (!selectedContent) return null;
    if (selectedContent.status === 'not_started') return 'feynman';
    if (selectedContent.status === 'in_progress') return 'blurting';
    if (selectedContent.status === 'completed') return 'recordacao_ativa';
    return null;
  }, [selectedContent]);

  const recommendedMethod = METHODS.find(m => m.id === recommendedMethodId);


  return (
    <div className={cn("space-y-12", className)}>
      {recommendedMethod && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              Dominus Recomenda
            </h3>
            <span className="h-px flex-1 ml-4 bg-primary/20" />
          </div>

          <button
            onClick={() => onSelectMethod(recommendedMethod.id)}
            className="group relative w-full overflow-hidden rounded-[2rem] border border-primary/30 bg-primary/5 p-8 text-left transition-all hover:bg-primary/10 hover:border-primary/50"
          >
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <recommendedMethod.icon className="h-8 w-8" />
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="text-xl font-black tracking-tight text-foreground">
                  {recommendedMethod.title}
                </h4>
                <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-xl">
                  {recommendedMethod.recommendation || recommendedMethod.description}
                </p>
              </div>
              <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-black text-sm group-hover:gap-4 transition-all">
                COMEÇAR <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </button>

          <div className="flex items-center justify-center py-4">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">ou escolha outra forma de estudar</p>
          </div>
        </div>
      )}

      {categories.map((cat) => (
        <div key={cat.id} className="space-y-4">
          <div className="flex items-center gap-2">
            <cat.icon className="h-4 w-4 text-muted-foreground/40" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
              {cat.label}
            </h3>
            <span className="h-px flex-1 ml-4 bg-border/20" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {METHODS.filter(m => m.category === cat.id).map((method) => (
              <button
                key={method.id}
                onClick={() => onSelectMethod(method.id)}
                className="group relative flex flex-col p-6 rounded-[1.5rem] border border-border/40 bg-surface/20 text-left transition-all hover:border-primary/20 hover:bg-surface/30 active:scale-[0.98]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                    <method.icon className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                
                <div className="space-y-1">
                  <h4 className="font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {method.title}
                  </h4>
                  <p className="text-xs text-muted-foreground/60 leading-relaxed">
                    {method.description}
                  </p>
                </div>

                <div className="absolute inset-0 rounded-[1.5rem] bg-primary/0 group-hover:bg-primary/[0.02] pointer-events-none transition-colors" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
