# Auditoria Semântica, Cognitiva e de UX - Memory Dashboard

Este documento define as regras, semânticas e critérios para o Dashboard de Memória do DominusApp, garantindo que dados técnicos do FSRS v4 sejam traduzidos em interpretações humanas úteis, factuais e não punitivas.

## 1. Definição dos Estados Humanos

Os estados são baseados no `memory_states` e em evidências cognitivas recentes.

### Novo
- **Gatilho**: `reps = 0` (Nenhuma repetição registrada).
- **Semântica**: "Ainda não possui evidência cognitiva suficiente."
- **Limitação**: Indica apenas ausência de teste, não ausência de conhecimento prévio.

### Em aprendizagem
- **Gatilho**: `reps > 0` e `stability < 5 dias` e não se enquadra em "Precisa de reforço".
- **Semântica**: "Conceito em processo inicial de construção de memória."
- **Justificativa**: O usuário já interagiu, mas o intervalo de retenção previsto ainda é curto.

### Precisa de reforço
- **Gatilho**: `reps > 0` AND (`last_result` incorreto/parcial OR `lapses > 2`).
- **Semântica**: "Histórico recente com dificuldades ou falhas de recuperação."
- **Limitação**: Prioriza a evidência mais recente e a recorrência de falhas (lapses) para evitar interpretações precipitadas.

### Em consolidação
- **Gatilho**: `reps >= 3` AND `stability >= 5 dias`.
- **Semântica**: "Conceito recuperado com consistência em intervalos crescentes."
- **Justificativa**: Exige maturidade da memória (repetições) e um intervalo de confiança moderado.

### Estável
- **Gatilho**: `stability >= 15 dias` AND `isDue = false`.
- **Semântica**: "Histórico consistente e sem necessidade imediata de recuperação."
- **Nota**: Não usamos "Dominado" ou "Aprendido". Estável refere-se à previsibilidade do motor FSRS.

## 2. Discrepância Metacognitiva

- **Regra**: Detectada quando `last_confidence >= 3` (Alta/Boa) mas `last_result` é `incorrect` ou `partial`.
- **Alertas**: "Sua confiança está acima da sua recuperação recente" ou "Vale testar este conceito novamente."
- **Tom**: Factual, educativo e não punitivo.

## 3. Merece sua atenção

Seção de prioridade baseada em política clara:
1. **Discrepância Metacognitiva**: Risco alto de ilusão de competência.
2. **Revisões Devidas**: O momento científico de recuperação chegou.
3. **Estado de Reforço**: Falhas recentes confirmadas.

## 4. Separação Atividade vs. Memória

- **Atividade (Factual)**: Tempo estudado, sessões concluídas.
- **Memória (Evidência)**: Recuperações bem-sucedidas, estados de memória FSRS.
- **Proibição**: O sistema nunca correlaciona "tempo gasto" com "retenção garantida".

## 5. Terminologia e Copy

- **Revisão Devida**: Significa estritamente que o FSRS prevê que a recuperação é necessária agora. Não prova esquecimento.
- **Retenção**: Evitamos o termo "Evolução da Retenção" em favor de "Histórico de Recuperações" ou "Conceitos Estabilizados", a menos que uma métrica de probabilidade de retenção seja formalmente validada na UX.
- **Proibidos**: "Dominado", "100%", "Memorizado para sempre".

## 6. Performance e Segurança

- O dashboard consome `memory_states` e agregações prontas.
- Nenhuma recalcular de FSRS ocorre no render da UI.
- Filtro obrigatório: `is_test_data = false`. Dados de auditoria ou teste nunca poluem o dashboard real.

## 7. Acessibilidade e UX

- Cores (Magenta/Verde/Laranja) são acompanhadas de labels e ícones semânticos.
- Usuários novos recebem estados educativos ("Seu mapa está começando") em vez de indicadores de erro ou vazio absoluto.
- A rota `/app/desempenho` foca em utilidade cognitiva, não em SEO ou métricas de vaidade.
