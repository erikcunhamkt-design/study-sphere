---
name: Fase 07.1 — Gate 1 (Plano): Fundação do Cérebro-mascote (índice de saúde)
description: Definição da fórmula do índice de saúde, curva de decaimento, contrato da RPC e visualização do mascote.
type: feature
---

# PLANO DE IMPLEMENTAÇÃO — FASE 07.1

Este documento detalha o motor do "Cérebro-mascote", o sistema de gamificação que reflete a saúde cognitiva baseada no comportamento de estudo.

## 1. FÓRMULA DO ÍNDICE DE SAÚDE (0–100)

O índice é composto por três pilares, calculados sobre uma **janela de 7 dias civis** (usando `civilDateInTimezone` do perfil).

### A. Componentes e Pesos
1.  **TEMPO (40%)**: Minutos totais estudados.
    *   *Meta:* 300 min/semana (avg 60 min/dia em 5 dias).
    *   *Cálculo:* `min(minutos_reais / 300, 1.0) * 40`.
2.  **DOMÍNIO (30%)**: Taxa de acerto em Flashcards e Questões.
    *   *Métrica:* Média ponderada entre acertos em questões e rating de flashcards (Bom/Fácil = 1, Difícil/Errei = 0).
    *   *Cálculo:* `(taxa_acerto_questoes * 0.5 + taxa_sucesso_flashcards * 0.5) * 30`.
3.  **CONSISTÊNCIA (30%)**: Dias ativos na janela.
    *   *Meta:* 5 dias ativos em 7.
    *   *Cálculo:* `min(dias_ativos / 5, 1.0) * 30`.

**Índice Base = TEMPO + DOMÍNIO + CONSISTÊNCIA.**

---

## 2. CURVA DE DECAIMENTO E REALISMO

O decaimento reduz o **Índice Base** conforme os dias de ausência.

### A. A Função de Decaimento
Seja `D` o número de dias desde a última atividade (estudo, questão ou flashcard).
*   **D = 0 ou 1**: Fator 1.0 (sem decaimento).
*   **D = 2 a 4**: Suave. `Fator = 1.0 - (D-1) * 0.05`. (Perda de 5% a 15%).
*   **D > 4**: Íngreme. `Fator = 0.85 * (0.8 ^ (D-4))`. (Cai rápido, mas nunca chega a zero absoluto).

**Índice Final = Índice Base * Fator.**

### B. Blindagem (Folgas e Férias)
No cálculo de `D`, dias marcados como "Folga Planejada" ou "Modo Férias" (via tabela futura, agora conjunto vazio) são **descontados**.
Exemplo: Se o usuário não estuda há 5 dias, mas 2 foram folgas planejadas, `D = 3`.

---

## 3. ESTÁGIOS E VIGOR

### A. Estágio (1–5) — "Conhecimento Construído"
Baseado na pontuação acumulada de **TEMPO + DOMÍNIO** (0–70 pontos):
1.  **Semente (0–15)**: O início.
2.  **Broto (16–30)**: Primeiras conexões.
3.  **Córtex Jovem (31–45)**: Estrutura visível.
4.  **Cérebro Ativo (46–60)**: Alta performance.
5.  **Cérebro Mestre (>60)**: Domínio total.

### B. Vigor (0–100) — "Brilho"
Reflete puramente a **CONSISTÊNCIA** recente (dias ativos e proximidade da última atividade).
*   `Vigor = Consistência_0_30 * (100 / 30) * Fator_Decaimento`.

---

## 4. CONTRATO DA RPC (`get_brain_state`)

### Assinatura e Segurança
*   `public.get_brain_state()`
*   `SECURITY INVOKER` (Respeita RLS: só lê dados do `auth.uid()`).
*   `SET search_path = public`.

### Retorno (JSON)
```json
{
  "score": 85,          // 0-100
  "stage": 4,          // 1-5
  "vigor": 90,          // 0-100
  "breakdown": {
    "time": 38,        // max 40
    "mastery": 25,     // max 30
    "consistency": 22  // max 30
  },
  "decay": {
    "factor": 1.0,
    "days_absent": 0,
    "message": "Seu cérebro está em plena forma!"
  }
}
```

### Queries Internas
1.  **Tempo**: `SUM(duration_seconds)` em `study_sessions` (últimos 7 dias).
2.  **Questões**: `COUNT` total vs `COUNT` onde `is_correct = true` em `question_attempts`.
3.  **Flashcards**: Média de `rating` em `flashcard_reviews` (mapeando `facil/bom` -> 1, `dificil/errei` -> 0).
4.  **Dias Ativos**: `COUNT(DISTINCT DATE(started_at AT TIME ZONE profile.timezone))`.

---

## 5. INTERFACE (UI)

### Dashboard (`/app`)
*   **Mini Cérebro**: SVG estático.
    *   `scale`: Proporcional ao `stage`.
    *   `opacity/glow`: Proporcional ao `vigor`.
    *   `color`: Magenta (OKLCH) variando saturação.
*   **Barra de Progresso**: Índice 0–100.

### Tela de Saúde do Cérebro (`/app/desempenho/saude`)
*   Cérebro centralizado em destaque.
*   Cards com o breakdown (Tempo, Domínio, Consistência).
*   **Mensagem de Transparência**: "Você está no Estágio 4. Não estuda há 2 dias, o vigor caiu 5%. Estude hoje para recuperar o brilho!"

---

## 6. CONFORMIDADE E PERFORMANCE

*   **RLS**: A RPC usa dados protegidos. Sem vazamento de dados.
*   **Timezone**: A RPC receberá `p_timezone` (do perfil) para truncar datas civis corretamente via `AT TIME ZONE`.
*   **Performance**: Uso de índices existentes em `started_at` / `created_at`.
*   **Fatiamento**: Focado em dados estáticos e motor de cálculo. Animações e estados de transição ficam para a Fase 07.2.

---
*Gate 1 Aprovado. Pronto para Gate 2 (SQL).*
