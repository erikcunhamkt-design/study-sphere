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

interface MethodOption {
  id: StudyMethod;
  title: string;
  description: string;
  icon: any;
  category: "aprender" | "recuperar" | "questoes";
}

const METHODS: MethodOption[] = [
  {
    id: "pomodoro",
    title: "Pomodoro",
    description: "Foco profundo com intervalos.",
    icon: Clock,
    category: "aprender"
  },
  {
    id: "cornell",
    title: "Cornell",
    description: "Notas estruturadas e síntese.",
    icon: BookOpen,
    category: "aprender"
  },
  {
    id: "feynman",
    title: "Feynman",
    description: "Ensine para aprender melhor.",
    icon: Brain,
    category: "aprender"
  },
  {
    id: "blurting",
    title: "Blurting",
    description: "Despeje tudo que você lembra.",
    icon: Zap,
    category: "recuperar"
  },
  {
    id: "recordacao_ativa",
    title: "Flashcards",
    description: "Repetição espaçada inteligente.",
    icon: Layers,
    category: "recuperar"
  },
  {
    id: "livre",
    title: "Simulado",
    description: "Pratique com questões reais.",
    icon: ListChecks,
    category: "questoes"
  }
];

interface StudyMethodsHubProps {
  onSelectMethod: (method: StudyMethod) => void;
  className?: string;
}

export function StudyMethodsHub({ onSelectMethod, className }: StudyMethodsHubProps) {
  const categories = [
    { id: "aprender", label: "Aprender", icon: BookOpen },
    { id: "recuperar", label: "Recuperar", icon: Brain },
    { id: "questoes", label: "Praticar", icon: ListChecks },
  ];

  return (
    <div className={cn("space-y-8", className)}>
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
