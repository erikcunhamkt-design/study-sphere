# User Lifecycle — Quem é novo no Dominus

Fonte central: `useUserLifecycle()` (`src/features/onboarding/use-user-lifecycle.ts`).
O onboarding (`useOnboarding`, `OnboardingHome`, `useOnboardingHomeVisible`) consome
essa fonte. Nenhuma tela decide sozinha se o usuário é novo.

## Estados

| Estado | Significado |
| :--- | :--- |
| `new` | Nunca iniciou a experiência: sem atividade real e sem progresso de onboarding. |
| `onboarding` | Começou a primeira experiência guiada, mas ainda não gerou atividade real. |
| `active` | Já viveu o produto (atividade real) ou concluiu/pulou a primeira experiência. |

## O que conta como ATIVIDADE REAL

Qualquer registro não-teste pertencente ao usuário em:

- `study_sessions` (sessão iniciada ou concluída);
- `cognitive_evidences` (primeira recuperação);
- `memory_states` (memória/FSRS existente).

Também encerram a primeira experiência: `first_cycle_completed_at` preenchido
ou `onboarding_state = 'skipped'`.

## O que NÃO conta

- **Conteúdo sem estudo**: cursos, módulos, aulas, materiais e baralhos.
  Quem apenas adicionou conteúdo ainda não viveu a experiência principal e
  permanece **novo** → o onboarding continua aparecendo (Teste B).
- **Dados de teste/auditoria**: qualquer linha com `is_test_data = true` é
  ignorada. Um teste de FSRS nunca transforma um usuário novo em veterano.
- **Conteúdo arquivado**.

## Precedência

```
atividade real  >  first_cycle_completed_at / skipped  >  onboarding_state  >  onboarding_completed
```

Se a flag disser "novo" mas houver histórico real, o usuário é tratado como
**veterano** e o banner "Bem-vindo ao Dominus" não é renderizado — sem
placeholder, sem container vazio, sem copy substituta. A saudação normal da
Home ocupa o espaço, e o Next Action Engine segue sendo a única fonte da
próxima ação.
