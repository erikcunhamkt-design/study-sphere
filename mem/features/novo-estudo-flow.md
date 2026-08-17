---
name: Fluxo Novo Estudo (criação unificada)
description: Criação de estudo em uma única tela (/app/novo-estudo) sem exigir área, módulo ou aula, com entrada direta na Sessão Aprender.
type: feature
---

- Rota `/app/novo-estudo`: nome + "tem módulos?" + conteúdo, tudo na mesma tela. Nunca transformar em wizard.
- Nada é persistido até "Criar e começar"; `createQuickStudy()` cria área/curso/módulo/aula/documento atomicamente com rollback.
- Sem módulos → módulo interno "Conteúdo" + aula com o nome do estudo (invisíveis ao usuário).
- Documento é salvo E publicado na criação, senão a Sessão Aprender mostra "sem material publicado".
- Após criar, navega direto para `/app/estudar?method=aprender&courseId=<id>`.
- Documentado em `docs/NOVO_ESTUDO_FLOW.md`.
