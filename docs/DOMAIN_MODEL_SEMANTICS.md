# Domain Model Semantics

## Core Philosophy
The Domain Model aggregates individual concept memory states into a higher-level interpretation of a student's grasp over a specific area (Study Area). It prioritizes **honesty** and **explainability** over gamified metrics like percentage scores.

## Domain Units
The primary unit of domain aggregation is the **Study Area**. 
Grouping hierarchy: `Study Area -> Courses -> Lessons -> Concepts`.

## Mastery State Logic

### 1. NÃO AVALIADO (Not Evaluated)
- **Trigger**: `evaluated_concepts == 0`.
- **Copy**: "Ainda não avaliado. Estude e recupere os primeiros conceitos para começar a construir seu mapa de domínio."

### 2. EM CONSTRUÇÃO (Building)
- **Trigger**: `evaluated_concepts > 0` AND `coverage < 0.3` (less than 30% of total concepts).
- **Copy**: "O Dominus já possui algumas evidências, mas ainda precisa de mais recuperações para formar uma visão confiável."

### 3. EM DESENVOLVIMENTO (Developing)
- **Trigger**: `coverage >= 0.3` AND (`attention_concepts > 0` OR `fragile_concepts > 20%`).
- **Copy**: "Você já possui evidências relevantes, mas alguns conceitos ainda precisam de atenção."

### 4. CONSISTENTE (Consistent)
- **Trigger**: `coverage >= 0.6` AND `attention_concepts == 0` AND `avg_stability > 10 days`.
- **Copy**: "A maior parte dos conceitos relevantes apresenta histórico consistente."

### 5. FORTE (Strong)
- **Trigger**: `coverage >= 0.85` AND `attention_concepts == 0` AND `avg_stability > 30 days` AND `no_metacognitive_mismatches`.
- **Copy**: "A área possui cobertura ampla e histórico consistente de recuperação."

## Key Metrics

### Coverage
Factual count of concepts with at least one recovery evidence (`reps > 0`) vs total active concepts in the area.

### Attention Needed
Concepts within the area that meet any of these criteria:
- `is_due == true`
- `last_result` is failure (Incorrect/Partial)
- `metacognitive_mismatch == true` (High confidence + Bad result)

## Restrictions
1. **NO PERCENTAGES**: Do not display 0-100 scores.
2. **NO TIME BIAS**: Time spent studying does not impact domain state.
3. **EXCLUSION**: Ignore any rows marked as `is_test_data`.
