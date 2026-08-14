# Plano de Implementação: Fase 10 - ESTUDAR (Etapa 2)

Implementação do hub de métodos de estudo e runner de sessões, garantindo a transição fluida entre a escolha da ação e a execução.

## Ações Técnicas

### 1. Hub de Métodos
- Criar `src/features/study-sessions/components/study-methods-hub.tsx`.
- Implementar grid de métodos (Aprender, Recuperar, Questões) com sub-opções.
- Integrar os runners existentes (Pomodoro, Feynman, etc.) como estados do Hub.

### 2. Estudo em Massa (Baralhos)
- Integrar a escolha de Baralhos (Flashcards) diretamente no Hub de Estudos.
- Suportar modos "Revisão" (SM-2) e "Treino" (Livre).

### 3. Sessão Ativa & Conclusão
- Refinar a interface de sessão ativa para manter o visual premium da DominusApp.
- Garantir que a conclusão da sessão atualize o estado global e retorne ao Hub de Estudo com feedback visual.

### 4. Integração de Cursos
- Adicionar modal de seleção de Aula ao iniciar uma sessão a partir de um curso no hub.

## Detalhes Visuais
- Uso de cards com glow magenta para o método ativo.
- Tipografia densa e cronômetros minimalistas.
- Feedback de conclusão com microcopy encorajador ("Domínio aumentado", "Sessão concluída").
