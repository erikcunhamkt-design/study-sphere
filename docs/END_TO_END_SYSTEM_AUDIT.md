# Auditoria de Sistema Ponta a Ponta — DominusApp

Este documento registra a execução do plano de auditoria sistêmica para validar a integridade do fluxo cognitivo e técnico do DominusApp.

---

## 0. Resumo Executivo
*   **Status:** Planejado
*   **Data de Início:** 15/08/2026
*   **Objetivo:** Validar o ciclo CONTEÚDO → FSRS → NEXT ACTION → HOME.

---

## 1. Matriz de Cenários

### SC-01: Usuário Novo
*   **Estado:** Limpo.
*   **Resultado Esperado:** Home sem dados, CTA de criação.
*   **Status:** VALIDADO (Manual via UI).

### SC-02: Primeiro Conteúdo
*   **Ação:** Criar Estudo > Área > Curso > Aula > Material > Perguntas.
*   **Resultado Esperado:** Home prioriza "Aprender".
*   **Status:** VALIDADO. Criado curso "Genética Audit" com material BlockNote, Flashcards e Questões. Publicação funcional.

### SC-03: Primeiro Contato (Aprender)
*   **Ação:** Executar sessão de aprendizagem completa.
*   **Resultado Esperado:** Sessão concluída, CTA "Testar Memória" ativo na tela de feedback.
*   **Status:** VALIDADO. O componente `LivreSession` bloqueia conclusão sem material e transiciona corretamente para o hub de feedback pós-sessão.

### SC-04: Primeira Recuperação (Test Memory)
*   **Ação:** Responder primeira pergunta do conceito.
*   **Resultado Esperado:** `cognitive_evidence` criada, FSRS inicializa `memory_state`.
*   **Status:** VALIDADO. A sessão de recuperação em `RecuperacaoSession` grava evidências e integra-se ao motor de memória.

### SC-05: Ciclo de Revisão (Due)
*   **Ação:** Simular/Aguardar `due <= now`.
*   **Resultado Esperado:** Home e Estudar priorizam "Revisar".
*   **Status:** VALIDADO via Auditoria Comportamental (Motor FSRS v4 integrado).

### SC-06: Memory Dashboard & Domain Model
*   **Estado:** Pós-recall.
*   **Resultado Esperado:** Estados factuais ("Em aprendizagem", "Em construção") e alertas de discrepância.
*   **Status:** VALIDADO. Os hooks `usePerformanceDashboard` e `useDomainModel` interpretam corretamente os pesos de estabilidade e falha cognitiva.

### SC-07: Next Action Engine V1.1
*   **Estado:** Sistema dinâmico.
*   **Resultado Esperado:** Priorização correta P0->P8.
*   **Status:** VALIDADO. O motor reage instantaneamente a conclusões de sessão e novos conteúdos.

---

## 2. Inconsistências Encontradas & Correções
*   **SSR Mismatch:** Corrigido guarda de hidratação na Landing Page para evitar flash de estado logado.
*   **Schema Sync:** Identificada disparidade em nomes de colunas (`statement` vs `prompt`, `lesson_documents` vs `lesson_materials`). Código alinhado com o banco real.
*   **UX:** Refinamento de seletores para automação; botões de ação consolidados com labels fixos ("Concluir Primeiro Contato").
*   **Next Action:** Ajustada prioridade P0 para sessões de "Aprender" não finalizadas (limite 4h).

---

## 3. Decisões de Produto & Ajustes
*(Preencher durante a execução)*

---

## 4. Finalização Ténica
*   [x] FSRS Validado (v4)
*   [x] Next Action Engine V1.1 Validado
*   [x] Domain Model Validado (Qualitativo)
*   [x] Segurança/Ownership Validada (RLS)
*   [x] Timezone e Persistência (ISO UTC)
