
import { NextAction, NextActionType } from "../types";

/**
 * Pesos para o motor de prioridade
 */
export const WEIGHTS = {
  RESUME: 0,      // P0
  REVIEW: 1,      // P1
  REINFORCE: 2,   // P2
  TEST_MEMORY: 3, // P3 (Transição entre estudo e memória)
  FIRST_STUDY: 4, // P4
  CONTINUE: 5,    // P5
  EXPLORE: 6,     // P6
  ADD_CONTENT: 7, // P7
  ALL_CLEAR: 8,   // P8
};

/**
 * Formata a razão da recomendação de forma semântica
 */
export function formatReason(type: NextActionType, context: any): string {
  switch (type) {
    case 'resume':
      return `Você parou em "${context.title}" há ${context.timeAgo}.`;
    case 'review':
      return `${context.count} conceito${context.count > 1 ? 's estão' : ' está'} pronto para recuperação.`;
    case 'reinforce':
      return `Este conceito teve dificuldades nas últimas recuperações.`;
    case 'test_memory':
      return `Você estudou novos conceitos, mas sua memória ainda não foi avaliada.`;
    case 'first_study':
      return `Você ainda não iniciou seu primeiro conteúdo.`;
    case 'continue':
      return `Você está progredindo bem em "${context.title}".`;
    case 'explore':
      return `Você completou seus objetivos imediatos. Que tal algo novo?`;
    case 'add_content':
      return `Para começar a aprender, adicione sua primeira área de estudo.`;
    case 'all_clear':
      return `Tudo em dia! Sua memória está seguindo o cronograma planejado.`;
    default:
      return '';
  }
}
