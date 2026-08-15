/**
 * STUDY METHODS HUB — LIMPEZA FINAL APROVADA
 * 
 * Componente estratégico para seleção de métodos de estudo.
 * Prioriza a recomendação do Dominus e agrupa alternativas por categorias.
 */
import { useMemo, useState } from "react";
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
  category: "tempo" | "aprendizagem" | "recuperacao" | "avaliacao" | "sessao";
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
    description: "Explique o conceito com suas próprias palavras para verificar se realmente entendeu.",
    recommendation: "Você já teve contato suficiente com o conteúdo. Agora tente explicar para consolidar o entendimento.",
    icon: Brain,
    category: "aprendizagem"
  },
  {
    id: "cornell",
    title: "Cornell",
    displayName: "Anotar e organizar",
    description: "Estruture suas anotações com pistas e resumos.",
    icon: BookOpen,
    category: "aprendizagem"
  },
  {
    id: "blurting",
    title: "Blurting",
    displayName: "Recuperar o que lembra",
    description: "Escreva tudo o que lembra sem consultar o material.",
    recommendation: "Você já teve contato com este conteúdo. Agora tente lembrar sem consultar o material.",
    icon: Zap,
    category: "recuperacao"
  },
  {
    id: "recordacao_ativa",
    title: "Flashcards",
    displayName: "Testar memória",
    description: "Responda perguntas e compare com a resposta.",
    recommendation: "Você já estudou este conteúdo. Agora teste o que consegue lembrar através de flashcards.",
    icon: Layers,
    category: "recuperacao"
  },
  {
    id: "pomodoro",
    title: "Pomodoro",
    displayName: "Pomodoro",
    description: "Estude em blocos de tempo com intervalos.",
    icon: Clock,
    category: "tempo"
  },
  {
    id: "livre",
    title: "Livre",
    displayName: "Sessão Livre",
    description: "Estude livremente sem vincular a sessão a um método específico.",
    icon: ListChecks,
    category: "sessao"
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
  const [showAll, setShowAll] = useState(false);

  const categories = [
    { id: "recuperacao", label: "Recuperação", icon: Zap },
    { id: "aprendizagem", label: "Elaboração / Compreensão", icon: BookOpen },
    { id: "tempo", label: "Gestão de Tempo", icon: Clock },
    { id: "sessao", label: "Modo de Sessão", icon: ListChecks },
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

  const hasAlternatives = useMemo(() => {
    return METHODS.some(m => m.id !== recommendedMethodId);
  }, [recommendedMethodId]);

  return (
    <div className={cn("space-y-16", className)}>
      {recommendedMethod && (
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground/40">
              Dominus Recomenda
            </h3>
            <div className="h-px flex-1 ml-2 bg-border/20" />
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

      {hasAlternatives && (
        <div className="space-y-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground/40">
                Outras formas de estudar
              </h3>
              <div className="h-px w-20 bg-border/20" />
            </div>
            
            {!showAll && (
              <button 
                onClick={() => setShowAll(true)}
                className="text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors flex items-center gap-1"
              >
                Ver todas <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {showAll && (
            <div className="space-y-12 animate-in fade-in slide-in-from-top-2 duration-500">
              {categories
                .filter(cat => METHODS.some(m => m.category === cat.id && m.id !== recommendedMethodId))
                .map((cat) => (
                <div key={cat.id} className="space-y-6">
                  <div className="flex items-center gap-2 px-2">
                    <cat.icon className="h-3 w-3 text-muted-foreground/30" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/30">
                      {cat.label}
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {METHODS.filter(m => m.category === cat.id && m.id !== recommendedMethodId).map((method) => (
                      <button
                        key={method.id}
                        onClick={() => onSelectMethod(method.id)}
                        className="group relative flex flex-col p-5 rounded-[1.5rem] border border-border/20 bg-surface/10 text-left transition-all hover:border-primary/10 hover:bg-surface/20 active:scale-[0.98]"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 rounded-xl bg-surface/30 border border-border/5 flex items-center justify-center text-muted-foreground/40 group-hover:text-primary group-hover:bg-primary/5 transition-all">
                            <method.icon className="h-5 w-5" />
                          </div>
                          <ChevronRight className="h-3 w-3 text-muted-foreground/5 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="text-base font-black tracking-tight text-foreground/80 group-hover:text-foreground transition-colors">
                            {method.displayName}
                          </h4>
                          <p className="text-[13px] text-muted-foreground/40 leading-snug font-medium">
                            {method.description}
                          </p>
                          <div className="pt-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/10 group-hover:text-primary/30 transition-colors">
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
          )}
        </div>
      )}
    </div>
  );
}