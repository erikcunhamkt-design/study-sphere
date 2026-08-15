import type { RecallResult } from "@/features/study-sessions/types";

export type MemoryHumanState = 
  | "novo" 
  | "aprendizagem" 
  | "reforco" 
  | "consolidacao" 
  | "estavel";

export interface HumanStateInfo {
  label: string;
  description: string;
  color: string;
  state: MemoryHumanState;
}

export const HUMAN_STATES: Record<MemoryHumanState, HumanStateInfo> = {
  novo: {
    label: "Novo",
    description: "Ainda não possui evidência cognitiva suficiente.",
    color: "text-muted-foreground/60 bg-muted/10",
    state: "novo",
  },
  aprendizagem: {
    label: "Em aprendizagem",
    description: "Conceito em processo inicial de construção de memória.",
    color: "text-blue-500 bg-blue-500/10",
    state: "aprendizagem",
  },
  reforco: {
    label: "Precisa de reforço",
    description: "Histórico recente com dificuldades ou falhas de recuperação.",
    color: "text-orange-500 bg-orange-500/10",
    state: "reforco",
  },
  consolidacao: {
    label: "Em consolidação",
    description: "Conceito recuperado com consistência em intervalos crescentes.",
    color: "text-magenta bg-magenta/10",
    state: "consolidacao",
  },
  estavel: {
    label: "Estável",
    description: "Histórico consistente e sem necessidade imediata de recuperação.",
    color: "text-emerald-500 bg-emerald-500/10",
    state: "estavel",
  },
};

/**
 * Mapeia o estado técnico do FSRS para uma interpretação humana.
 * Regras:
 * 1. Novo: reps = 0
 * 2. Precisa de reforço: reps > 0 E (último resultado foi incorreto/parcial OU lapsos altos)
 * 3. Estável: Estabilidade > 15 dias E não está devido
 * 4. Consolidação: Reps > 3 E Estabilidade > 5 dias
 * 5. Aprendizagem: Resto (reps > 0 mas estabilidade baixa)
 */
export function mapToHumanState(data: {
  reps: number;
  stability: number;
  difficulty: number;
  lastResult: RecallResult | null;
  lapses: number;
  isDue: boolean;
}): HumanStateInfo {
  const { reps, stability, lastResult, lapses, isDue } = data;

  if (reps === 0) return HUMAN_STATES.novo;

  const wasBad = lastResult === "incorrect" || 
                 lastResult === "partial" || 
                 lastResult === "self_reported_incorrect" || 
                 lastResult === "self_reported_partial";

  if (wasBad || lapses > 2) return HUMAN_STATES.reforco;

  // stability no banco está em dias (float)
  if (stability >= 15 && !isDue) return HUMAN_STATES.estavel;
  
  if (reps >= 3 && stability >= 5) return HUMAN_STATES.consolidacao;

  return HUMAN_STATES.aprendizagem;
}

/**
 * Detecta discrepância metacognitiva: Confiança alta mas resultado ruim.
 */
export function checkMetacognitiveMismatch(confidence: number | null, result: RecallResult | null): boolean {
  if (!confidence || !result) return false;
  
  const highConfidence = confidence >= 3;
  const badResult = result === "incorrect" || 
                    result === "partial" || 
                    result === "self_reported_incorrect" || 
                    result === "self_reported_partial";
                    
  return highConfidence && badResult;
}
