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
*   **Evidência:** [Pendente]

### SC-02: Primeiro Conteúdo
*   **Ação:** Criar Estudo > Área > Curso > Aula > Material > Perguntas.
*   **Resultado Esperado:** Home prioriza "Aprender".
*   **Evidência:** [Pendente]

### SC-03: Primeiro Contato (Aprender)
*   **Ação:** Executar sessão de aprendizagem completa.
*   **Resultado Esperado:** Sessão concluída, CTA "Testar Memória" ativo.
*   **Evidência:** [Pendente]

### SC-04: Primeira Recuperação (Test Memory)
*   **Ação:** Responder primeira pergunta do conceito.
*   **Resultado Esperado:** `cognitive_evidence` criada, FSRS inicializa `memory_state`.
*   **Evidência:** [Pendente]

### SC-05: Ciclo de Revisão (Due)
*   **Ação:** Simular/Aguardar `due <= now`.
*   **Resultado Esperado:** Home e Estudar priorizam "Revisar".
*   **Evidência:** [Pendente]

---

## 2. Inconsistências Encontradas
*(Preencher durante a execução)*

---

## 3. Decisões de Produto & Ajustes
*(Preencher durante a execução)*

---

## 4. Finalização Ténica
*   [ ] FSRS Validado
*   [ ] Next Action Engine V1.1 Validado
*   [ ] Domain Model Validado
*   [ ] Segurança/Ownership Validada
*   [ ] Timezone e Persistência
