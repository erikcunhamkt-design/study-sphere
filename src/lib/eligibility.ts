/**
 * Regra central de elegibilidade de conteúdo para o DominusApp.
 * Define o que é considerado conteúdo de "produção" versus conteúdo de "teste/auditoria".
 */

export interface EligibleEntity {
  is_test_data?: boolean;
  user_id?: string;
  is_archived?: boolean;
}

/**
 * Retorna true se a entidade for elegível para exibição na experiência normal do usuário.
 */
export function isProductionEligible(entity: EligibleEntity | null | undefined): boolean {
  if (!entity) return false;
  
  // 1. Isolamento Estrutural: Se for marcado como dado de teste, nunca é elegível para produção.
  if (entity.is_test_data === true) return false;
  
  // 2. Arquivamento: Conteúdo arquivado geralmente não é "ativo", mas pode ser elegível dependendo do contexto.
  // Por enquanto, consideramos apenas o flag is_test_data como critério principal de isolamento.
  
  return true;
}

/**
 * Helper para filtros de array no frontend.
 */
export function filterProductionEligible<T extends EligibleEntity>(entities: T[] | null | undefined): T[] {
  if (!entities) return [];
  return entities.filter(isProductionEligible);
}
