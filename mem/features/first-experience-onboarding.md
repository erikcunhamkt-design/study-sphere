---
name: Primeira experiência guiada (Onboarding)
description: Regras do onboarding do Dominus — sem tutorial, o usuário aprende usando o produto no primeiro ciclo cognitivo.
type: feature
---

- Sem tutorial, sem slides, sem tela cheia: o onboarding é um bloco integrado à Home.
- Fluxo: entrar → entender em segundos → adicionar/escolher conteúdo → primeiro contato → testar memória → primeira evidência → entender revisão → voltar à Home.
- Estados em `profiles.onboarding_state`: new_user, onboarding_started, has_content, first_study_started, first_contact_completed, first_recall_completed, first_cycle_completed, skipped. Estado nunca retrocede.
- Eventos internos em `onboarding_events` (sem dashboard) para medir abandono.
- Micro-orientação só na primeira sessão de aprendizagem e na primeira recuperação; some depois.
- O fechamento do primeiro ciclo mostra a próxima recuperação real (calculada pelo motor), sem termos técnicos (nada de FSRS/estabilidade/dificuldade).
- Onboarding nunca altera o motor cognitivo (FSRS, Domain Model, Next Action Engine) nem bloqueia o fluxo real.
- Usuários antigos com `onboarding_completed = true` não são reintroduzidos.
