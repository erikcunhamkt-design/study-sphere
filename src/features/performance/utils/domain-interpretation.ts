import { RecallResult } from "@/features/study-sessions/types";

export type DomainMasteryState = 
  | "nao_avaliado"
  | "em_construcao" 
  | "em_desenvolvimento"
  | "consistente"
  | "forte";

export interface DomainStateInfo {
  label: string;
  description: string;
  color: string;
  state: DomainMasteryState;
}

export const DOMAIN_STATES: Record<DomainMasteryState, DomainStateInfo> = {
  nao_avaliado: {
    label: "Ainda não avaliado",
    description: "Estude e recupere os primeiros conceitos para começar a construir seu mapa de domínio.",
    color: "text-muted-foreground/40 bg-muted/5",
    state: "nao_avaliado",
  },
  em_construcao: {
    label: "Em construção",
    description: "O Dominus já possui algumas evidências, mas ainda precisa de mais recuperações.",
    color: "text-blue-400 bg-blue-400/5",
    state: "em_construcao",
  },
  em_desenvolvimento: {
    label: "Em desenvolvimento",
    description: "Você já possui evidências relevantes, mas alguns conceitos ainda precisam de atenção.",
    color: "text-orange-400 bg-orange-400/5",
    state: "em_desenvolvimento",
  },
  consistente: {
    label: "Consistente",
    description: "A maior parte dos conceitos relevantes apresenta histórico consistente.",
    color: "text-magenta bg-magenta/5",
    state: "consistente",
  },
  forte: {
    label: "Forte",
    description: "A área possui cobertura ampla e histórico consistente de recuperação.",
    color: "text-emerald-500 bg-emerald-500/5",
    state: "forte",
  },
};

export interface DomainMetrics {
  totalConcepts: number;
  evaluatedConcepts: number;
  attentionConcepts: number;
  dueConcepts: number;
  avgStability: number;
  hasMismatch: boolean;
}

export function calculateDomainMastery(metrics: DomainMetrics): DomainStateInfo {
  const { totalConcepts, evaluatedConcepts, attentionConcepts, avgStability, hasMismatch } = metrics;
  
  if (totalConcepts === 0 || evaluatedConcepts === 0) {
    return DOMAIN_STATES.nao_avaliado;
  }

  const coverage = evaluatedConcepts / totalConcepts;

  // 1. Forte: Cobertura alta + Estabilidade + Sem problemas + Sem atrasos
  // Exige cobertura quase total (85%) e memória sólida
  if (coverage >= 0.85 && attentionConcepts === 0 && avgStability >= 30 && !hasMismatch && metrics.dueConcepts === 0) {
    return DOMAIN_STATES.forte;
  }

  // 2. Consistente: Cobertura média/alta + Estabilidade + Sem falhas recentes
  // Permite alguns conceitos devidos (due), mas não falhas recentes ou lacunas críticas
  if (coverage >= 0.6 && attentionConcepts === 0 && avgStability >= 10) {
    return DOMAIN_STATES.consistente;
  }

  // 3. Em construção: Cobertura muito baixa (<30%)
  if (coverage < 0.3) {
    return DOMAIN_STATES.em_construcao;
  }

  // 4. Em desenvolvimento: Cobertura razoável mas com falhas, instabilidades ou desalinhamentos
  return DOMAIN_STATES.em_desenvolvimento;
}
