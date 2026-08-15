# Domain Model Semantics — V1 Validado

## Core Philosophy
O Domain Model agrega os estados de memória individual dos conceitos em uma interpretação de alto nível do domínio do estudante sobre uma **Study Area** específica. Prioriza a **honestidade cognitiva** e **explicabilidade** sobre métricas gamificadas.

## 1. Fonte dos Agrupamentos
- **Entidade**: `study_areas`
- **Cadeia de Dados**: `Study Area -> Courses -> Lessons -> Concepts -> Memory States`.
- **Justificativa**: A área representa a disciplina ou macro-tema organizacional do usuário.

## 2. Regras de Estado (Determinísticas e Conservadoras)

### NÃO AVALIADO (Not Evaluated)
- **Gatilho**: `total_concepts == 0` OU `evaluated_concepts == 0`.
- **Significado**: O usuário ainda não gerou nenhuma evidência cognitiva (recuperação ativa) nesta área.
- **Copy**: "Ainda não avaliado. Estude e recupere os primeiros conceitos para começar a construir seu mapa de domínio."

### EM CONSTRUÇÃO (Building)
- **Gatilho**: `evaluated_concepts > 0` AND `coverage < 0.3` (menos de 30% dos conceitos totais avaliados).
- **Significado**: O sistema já tem evidências, mas a base é muito pequena para conclusões de domínio.
- **Copy**: "O Dominus já possui algumas evidências, mas ainda precisa de mais recuperações para formar uma visão confiável."

### EM DESENVOLVIMENTO (Developing)
- **Gatilho**: `coverage >= 0.3` E (`attention_concepts > 0` OU `fragile_concepts > 20%` OU `has_mismatch == true`).
- **Significado**: Existe cobertura razoável, mas há falhas recentes, lacunas ou desalinhamento metacognitivo.
- **Copy**: "Você já possui evidências relevantes, mas alguns conceitos ainda precisam de atenção."

### CONSISTENTE (Consistent)
- **Gatilho**: `coverage >= 0.6` AND `attention_concepts == 0` AND `avg_stability >= 10 days`.
- **Significado**: A maioria dos conceitos avaliados está estável e sem falhas recentes.
- **Nota**: Pode haver conceitos devidos (due), pois "due" não significa "esquecido", mas sim "pronto para recuperação".
- **Copy**: "A maior parte dos conceitos relevantes apresenta histórico consistente."

### FORTE (Strong)
- **Gatilho**: `coverage >= 0.85` AND `attention_concepts == 0` AND `avg_stability >= 30 days` AND `no_mismatch` AND `due_concepts == 0`.
- **Significado**: Cobertura quase total, memória profunda (alta estabilidade) e tudo em dia.
- **Copy**: "A área possui cobertura ampla e histórico consistente de recuperação."

## 3. Métricas e Auditoria

### Cobertura (Coverage)
Contagem factual de conceitos com pelo menos uma evidência de recuperação (`reps > 0`) vs total de conceitos ativos na área.

### Atenção Necessária
Conceitos que apresentam:
- `last_result` incorreto ou parcial.
- `metacognitive_mismatch`: Confiança alta (3-4) com resultado ruim.
- **Nota**: Conceitos `due` (atrasados) geram indicadores visuais, mas não derrubam o estado para "Em desenvolvimento" a menos que haja falha real, preservando a diferença entre "hora de revisar" e "não sei o conteúdo".

### Novos Conceitos e Arquivamento
- **Conceito Novo**: Reduz a cobertura proporcionalmente, podendo mover a área de "Forte" para "Consistente" ou "Em Desenvolvimento".
- **Conceito Arquivado**: Removido do cálculo de domínio atual.
- **Alteração Editorial**: Novas versões de aulas mantêm os conceitos vinculados; o domínio é preservado pois as evidências cognitivas residem no conceito, não na versão do arquivo.

## 4. Performance e Segurança
- **Queries**: Agregação em memória após fetch único de `memory_states` para evitar N+1.
- **Segurança**: Filtro obrigatório por `user_id` e `is_test_data = false`. Usuários nunca acessam estados de memória de terceiros.
- **Consistência**: O hook `useDomainModel` é a única fonte de verdade para a Home (Cockpit) e Dashboard de Desempenho.

## 5. Restrições
1. **NÃO CRIAR DOMAIN SCORE**: Proibido exibir porcentagens 0-100 para domínio.
2. **NÃO ALTERAR FSRS**: O modelo de domínio interpreta os dados do motor, não o modifica.
3. **TRADUÇÃO HUMANA**: Fatores como estabilidade e dificuldade são traduzidos para "Estabilidade" e "Dificuldade" sem exibir os números brutos.
