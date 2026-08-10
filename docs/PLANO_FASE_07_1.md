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
    *   *Cálculo:* Se `total_respostas == 0`, assume-se valor neutro/esperado de `0.7` (70%) para não penalizar o usuário iniciante ou em novos ciclos. Se `total > 0`, `(taxa_acerto_questoes * 0.5 + taxa_sucesso_flashcards * 0.5) * 30`.
3.  **CONSISTÊNCIA (30%)**: Dias ativos na janela.
    *   *Meta:* 5 dias ativos em 7.
    *   *Cálculo:* `min(dias_ativos / 5, 1.0) * 30`.

**Índice Base = TEMPO + DOMÍNIO + CONSISTÊNCIA.**

---

## 2. CURVA DE DECAIMENTO E REALISMO

O decaimento reduz o **Índice Final** conforme os dias de ausência, agindo sobre o estado recente do mascote.

### A. A Função de Decaimento (Suavizada)
Seja `D` o número de dias desde a última atividade (estudo, questão ou flashcard).
*   **D = 0 ou 1**: Fator 1.0 (brilho máximo).
*   **D = 2 a 4**: Fase Linear Suave. `Fator = 1.0 - (D-1) * 0.05`. (Perdas de 5%, 10%, 15%).
*   **D = 5**: Transição. `Fator = 0.80` (Queda de 20%, suavizando o degrau anterior).
*   **D > 5**: Fase Exponencial. `Fator = 0.80 * (0.85 ^ (D-5))`. (Decaimento gradual e visível, sem saltos abruptos).

**Índice Final = Índice Base * Fator.**

### B. Blindagem (Folgas e Férias)
No cálculo de `D`, dias marcados como "Folga Planejada" ou "Modo Férias" são **descontados**.
Exemplo: Se o usuário não estuda há 5 dias, mas 2 foram folgas planejadas, `D = 3` (Fator 0.90).

---

## 3. ESTÁGIOS E VIGOR

### A. Estágio (1–5) — "Conhecimento Construído"
O Estágio reflete a memória de longo prazo e não pode sumir em 7 dias.
*   **Base de Cálculo (Janela Longa)**: Média móvel ponderada de (Tempo + Domínio) dos últimos **28 dias** (4 semanas).
*   **Fórmula do Estágio**: `Estágio_Base = (Média_28_dias / Meta_Semanal) * 100`.
*   **Decaimento do Estágio**: O Estágio não usa o `Fator` diário agressivo. Ele regride apenas se a Média Móvel de 28 dias cair. Isso garante que o progresso construído seja resiliente a pausas curtas, regredindo gradualmente apenas após ausência prolongada.
*   **Níveis**:
    1.  **Semente (0–20)**
    2.  **Broto (21–40)**
    3.  **Córtex Jovem (41–60)**
    4.  **Cérebro Ativo (61–80)**
    5.  **Cérebro Mestre (>80)**

### B. Vigor (0–100) — "Brilho e Estado Alerta"
Reflete a CONSISTÊNCIA e a RECÊNCIA. 
*   `Vigor_Base = min(Consistência_Janela_7_dias * (100 / 30), 100)`.
*   `Vigor_Final = Vigor_Base * Fator`.
*   *Nota: O decaimento atua aqui e no Índice Final, mas não é aplicado duplamente no cálculo do Índice Final (que usa o Índice Base).*

---

## 4. CONTRATO DA RPC (`get_brain_state`)

### Assinatura e Segurança
*   `public.get_brain_state()`
*   `SECURITY INVOKER` (Respeita RLS).

### Retorno (JSON)
```json
{
  "score": 85,          // Índice Final (0-100)
  "stage": 4,          // 1-5 (Baseado em 28 dias)
  "vigor": 90,          // 0-100 (Consistência * Decaimento)
  "breakdown": {
    "time": 38,        // max 40
    "mastery": 25,     // max 30
    "consistency": 22  // max 30
  },
  "decay": {
    "factor": 0.95,
    "days_absent": 2,
    "message": "Seu vigor caiu 5% devido a 2 dias de ausência. Estude hoje para brilhar!"
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
