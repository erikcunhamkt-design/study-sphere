# DECISÃO DO MOTOR DE MEMÓRIA — DOMINUSAPP

Data: 15 de Agosto de 2026
Status: **DECIDIDO (FSRS v4)**
Versão da Arquitetura: 1.2 (Metacognição Separada)

---

## 1. AUDITORIA DO MEMORY STATE ATUAL (V1)

A implementação atual (`memory_states` + `apply_evidence_to_memory_state`) foi auditada.

### Como os campos são calculados hoje:
*   **STRENGTH**: Calculado de forma binária e provisória no trigger: `0.5` para sucesso (`correct`, `self_reported_correct`), `0.1` para falha.
*   **STABILITY**: Valor estático placeholder de `1.0` (representando 1 dia).
*   **DIFFICULTY**: Valor estático placeholder de `3.0` (escala arbitrária).
*   **VALORES INICIAIS**: Inseridos no primeiro `apply_evidence`. Conceitos sem evidência não possuem linha em `memory_states`.
*   **RECÊNCIA**: O campo `last_recalled_at` é atualizado, mas não influencia o cálculo de força/estabilidade na V1.
*   **CONFIANÇA/AUTOAVALIAÇÃO**: Salvos na tabela, mas ignorados pelo cálculo de placeholder da V1.
*   **RESPOSTA PARCIAL/INCORRETA**: Tratadas como falha total (`v_is_success := v_result IN ('correct', 'self_reported_correct')`).

### Auditoria do Trigger:
*   O trigger `trigger_update_memory_on_evidence` realiza **persistência estrutural + cálculo cognitivo provisório**.
*   **Veredito**: A lógica de cálculo deve ser removida do trigger/SQL e movida para uma camada de "Engine" (ou RPC isolada) para permitir a troca do algoritmo sem migrações de esquema complexas.

---

## 2. SEMÂNTICA DOS CAMPOS (DEFINIÇÃO TÉCNICA)

Para evitar confusão, o Dominus adota a seguinte semântica baseada no modelo **DSR (Difficulty, Stability, Retrievability)**:

### STABILITY (S)
> O intervalo de tempo (em dias) necessário para que a probabilidade de recordação caia para 90%.
*   **Significado**: Quão "firme" a memória está.

### DIFFICULTY (D)
> A complexidade intrínseca do conceito para este usuário específico.
*   **Significado**: Quão difícil é aumentar a estabilidade deste conceito.

### STRENGTH (R - Retrievability)
> A probabilidade estimada (0-1) de o usuário lembrar do conceito *neste exato momento*.
*   **Significado**: Força atual da memória (volátil, cai com o tempo).

---

## 3. COMPARAÇÃO DE ALTERNATIVAS

| Critério | LEITNER | SM-2 (Anki antigo) | FSRS v4 (Dominus Escolha) | Modelo Próprio |
| :--- | :--- | :--- | :--- | :--- |
| **Granularidade** | Caixas (baixa) | Flashcard (média) | **Conceito (Alta)** | Custom |
| **Metacognição** | Não | Sim (Ease) | **Sim (DSR completo)** | Sim |
| **Histórico** | Não | Apenas última | **Sim (Otimização)** | Sim |
| **Resposta Parcial**| Não | Sim | **Sim (4 níveis)** | Sim |
| **Confiabilidade** | Baixa | Média | **Altíssima (SOTA)** | Incerta |
| **Custo Implement.**| Baixo | Médio | **Alto (Matemático)** | Altíssimo |

---

## 4. RECOMENDAÇÃO: FSRS v4 (Free Spaced Repetition Scheduler)

### MOTIVO DA ESCOLHA
1.  **Foco em Retencividade**: O FSRS é superior ao SM-2 em prever o esquecimento, reduzindo revisões desnecessárias.
2.  **Suporte Nativo a Metacognição**: Encaixa perfeitamente no nosso fluxo de "Confiança" e "Autoavaliação".
3.  **Independência de Formato**: Funciona para **Conceitos**, não apenas flashcards. Uma evidência de "Recuperação Livre" pesa tanto quanto um Flashcard.
4.  **Recalculabilidade**: Como temos o histórico imutável em `cognitive_evidences`, podemos re-treinar ou ajustar os pesos do FSRS no futuro.

### ADAPTAÇÕES NO MEMORY STATE
O banco atual é **90% compatível**. Mudanças necessárias:
*   **Remover**: `strength` (será calculado em tempo real como Retrievability ou renomeado).
*   **Adicionar**: `last_s` (estabilidade anterior) e `last_d` (dificuldade anterior) para evitar reprocessamento de todo o histórico a cada resposta.
*   **Adicionar**: `scheduled_at` (Data da próxima revisão recomendada).

---

## 5. ESTRATÉGIA DE IMPLEMENTAÇÃO (PRÓXIMAS FASES)

### Versionamento do Motor
Cada `memory_state` terá um campo `algorithm_version` (ex: `fsrs-v4`). Se mudarmos para `fsrs-v5`, o sistema saberá que precisa recalcular o estado na próxima evidência.

### Tratamento de Confiança vs. Resultado
*   **Objetivo Correto**: Peso máximo na Estabilidade.
*   **Autoavaliado Correto + Confiança Alta**: Estabilidade alta.
*   **Autoavaliado Correto + Confiança Baixa**: Aumenta Dificuldade (D), estabilidade cresce menos.
*   **Incorreto + Confiança Alta (ILUSÃO DE DOMÍNIO)**: Penalidade severa na estabilidade, reset de Dificuldade para o máximo.

### O Papel do Primeiro Contato
*   O "Primeiro Contato" (Sessão Aprender) **não cria Memory State**.
*   Ele apenas habilita a primeira "Recuperação". A memória nasce no teste, não na leitura.

---

## 6. CONCLUSÃO ARQUITETURAL

O Dominus adotará o **FSRS v4** como motor de inteligência. A infraestrutura de `cognitive_evidences` (imutável) garante que nunca perderemos os dados brutos, permitindo que a "inteligência" do motor evolua sem destruir o histórico do estudante.

**Próximo Passo (Não implementar agora)**: Criar a RPC `calculate_fsrs_next_state` que substitui os placeholders da V1.
