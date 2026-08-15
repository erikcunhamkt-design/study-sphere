import { useMemo } from "react";
import { 
  Zap, 
  Brain, 
  ListChecks, 
  Clock, 
  ChevronRight,
  ArrowRight,
  Layers,
  BookOpen,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudyMethod } from "../types";

interface MethodOption {
  id: StudyMethod;
  title: string;
  displayName: string;
  description: string;
  recommendation?: string;
  icon: any;
  category: "tempo" | "aprendizagem" | "recuperacao" | "avaliacao";
}

const METHODS: MethodOption[] = [
  {
    id: "aprender",
    title: "Aprender",
    displayName: "Aprender primeiro",
    description: "Explore o conteúdo pela primeira vez para compreender a base.",
    recommendation: "Este conteúdo ainda não foi estudado. Primeiro compreenda o material; depois o Dominus poderá testar o que você realmente reteve.",
    icon: BookOpen,
    category: "aprendizagem"
  },
  {
    id: "feynman",
    title: "Feynman",
    displayName: "Explicar conceito",
    description: "Explique o conceito com suas próprias palavras para verificar se entendeu.",
    recommendation: "Você já teve contato suficiente com o conteúdo. Agora tente explicar para consolidar o entendimento.",
    icon: Brain,
    category: "aprendizagem"
  },
  {
    id: "cornell",
    title: "Cornell",
    displayName: "Anotar e Organizar",
    description: "Estruture suas anotações com pistas e resumos.",
    icon: BookOpen,
    category: "aprendizagem"
  },
  {
    id: "blurting",
    title: "Blurting",
    displayName: "Recuperar o que lembra",
    description: "Escreva tudo o que você lembra sem consultar o material.",
    recommendation: "Você já teve contato com este conteúdo. Agora tente lembrar sem consultar o material.",
    icon: Zap,
    category: "recuperacao"
  },
  {
    id: "recordacao_ativa",
    title: "Flashcards",
    displayName: "Testar Memória",
    description: "Teste sua memória com perguntas e respostas.",
    recommendation: "Você já estudou este conteúdo. Agora teste o que consegue lembrar através de flashcards.",
    icon: Layers,
    category: "recuperacao"
  },
  {
    id: "pomodoro",
    title: "Pomodoro",
    displayName: "Pomodoro",
    description: "Gestão de tempo: foco profundo com intervalos.",
    icon: Clock,
    category: "tempo"
  },
  {
    id: "livre",
    title: "Livre",
    displayName: "Sessão Livre",
    description: "Estudo flexível sem método pré-definido.",
    icon: Clock,
    category: "tempo"
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
    { id: "recuperacao", label: "Recuperação", icon: Zap },
    { id: "aprendizagem", label: "Elaboração & Anotação", icon: BookOpen },
    { id: "tempo", label: "Gestão de Tempo", icon: Clock },
    // { id: "avaliacao", label: "Avaliação", icon: ListChecks },
  ];

  const recommendedMethodId = useMemo(() => {
    if (!selectedContent) return null;
    
    // ESTADO A - NOVO
    if (selectedContent.status === 'not_started') return 'aprender';
    
    // ESTADO B - JÁ ESTUDADO (In progress)
    if (selectedContent.status === 'in_progress') return 'blurting';
    
    // ESTADO D - BOM DOMÍNIO (Completed)
    if (selectedContent.status === 'completed') return 'recordacao_ativa';
    
    return null;
  }, [selectedContent]);

  const recommendedMethod = METHODS.find(m => m.id === recommendedMethodId);

  return (
    <div className={cn("space-y-16", className)}>
      {recommendedMethod && (
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">
              Dominus Recomenda
            </h3>
            <div className="h-px flex-1 ml-2 bg-gradient-to-r from-primary/30 to-transparent" />
          </div>

          <button
            onClick={() => onSelectMethod(recommendedMethod.id)}
            className="group relative w-full overflow-hidden rounded-[2.5rem] border border-primary/30 bg-surface/40 p-10 text-left transition-all hover:bg-surface/60 hover:border-primary/50 shadow-[0_0_50px_-12px_rgba(217,0,110,0.15)]"
          >
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8 relative z-10">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500 shadow-inner">
                <recommendedMethod.icon className="h-10 w-10" />
              </div>
              <div className="flex-1 space-y-3">
                <h4 className="text-2xl font-black tracking-tighter text-foreground">
                  {recommendedMethod.displayName}
                </h4>
                <p className="text-base text-muted-foreground/80 leading-relaxed max-w-2xl font-medium">
                  {recommendedMethod.recommendation}
                </p>
              </div>
              <div className="flex items-center gap-3 px-8 py-4 rounded-full bg-primary text-white font-black text-sm shadow-[0_0_30px_-5px_rgba(217,0,110,0.4)] group-hover:translate-x-2 transition-all duration-300">
                Começar <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </button>
        </div>
      )}

      <div className="space-y-12">
        <div className="flex items-center gap-3">
          <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground/40">
            Outras formas de estudar
          </h3>
          <div className="h-px flex-1 bg-border/20" />
        </div>

        <div className="space-y-12">
          {categories.map((cat) => (
            <div key={cat.id} className="space-y-6">
              <div className="flex items-center gap-2 px-2">
                <cat.icon className="h-3.5 w-3.5 text-muted-foreground/30" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/30">
                  {cat.label}
                </h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {METHODS.filter(m => m.category === cat.id && m.id !== recommendedMethodId).map((method) => (
                  <button
                    key={method.id}
                    onClick={() => onSelectMethod(method.id)}
                    className="group relative flex flex-col p-7 rounded-[2rem] border border-border/40 bg-surface/20 text-left transition-all hover:border-primary/20 hover:bg-surface/30 active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-surface/40 border border-border/10 flex items-center justify-center text-muted-foreground/60 group-hover:text-primary group-hover:bg-primary/5 transition-all">
                        <method.icon className="h-6 w-6" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/10 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-lg font-black tracking-tight text-foreground/90 group-hover:text-foreground transition-colors">
                        {method.displayName}
                      </h4>
                      <p className="text-sm text-muted-foreground/50 leading-relaxed font-medium">
                        {method.description}
                      </p>
                      <div className="pt-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/20 group-hover:text-primary/40 transition-colors">
                          Técnica: {method.title}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}