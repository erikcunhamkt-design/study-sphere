
export type NextActionType = 
  | 'resume'        // Continuar sessão real interrompida
  | 'review'        // Recuperar conceitos devidos (FSRS)
  | 'reinforce'     // Trabalhar conceitos frágeis (Attention/Mismatch)
  | 'test_memory'   // Usuário estudou mas não recuperou nada ainda
  | 'first_study'   // Iniciar primeiro estudo (usuário novo com conteúdo)
  | 'continue'      // Continuar aprendizado em curso em andamento
  | 'explore'       // Começar um novo conteúdo (sem conteúdo em andamento)
  | 'add_content'   // Usuário novo sem nenhum conteúdo
  | 'all_clear';    // Nenhuma ação urgente

export interface NextAction {
  type: NextActionType;
  priority: number; // 0 = P0 (highest)
  urgency: number;  // 0-1 score interno
  title: string;
  description: string;
  reason: string;
  cta: string;
  targetId?: string;
  targetType?: 'lesson' | 'session' | 'course' | 'review' | 'concept';
  metadata?: Record<string, any>;
}

export interface NextActionRecommendation {
  primary: NextAction;
  secondary: NextAction[];
  isLoading: boolean;
}
