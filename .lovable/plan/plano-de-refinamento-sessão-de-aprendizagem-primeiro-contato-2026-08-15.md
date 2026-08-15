# Plano de Refinamento: Sessão de Aprendizagem (Primeiro Contato)

O objetivo é transformar a tela de sessão `aprender` em um ambiente de estudo real, onde o conteúdo da aula é o protagonista e as notas são secundárias.

## 1. Investigação do Conteúdo Real
- O conteúdo das aulas no DominusApp é armazenado na tabela `lesson_documents` como um array de blocos JSON (padrão BlockNote).
- Já identifiquei que a aula de teste `asdad` possui conteúdo real (blocos de texto, blocos de estudo, etc.).

## 2. Reestruturação da Interface (`LivreSession.tsx`)
Vou reorganizar o layout para seguir a hierarquia: **Conteúdo > Compreensão > Notas > Conclusão**.

### Mudanças no Layout:
- **Área Principal (Esquerda/Centro)**: Renderização do conteúdo real da aula.
- **Área Lateral (Direita/Mobile abaixo)**: Notas ("O que você está descobrindo agora?"), Dicas e Orientação Pedagógica.
- **Cabeçalho**: Nome real do curso e da aula (hierárquico).
- **Rodapé**: Cronômetro discreto e botão de conclusão com lógica de bloqueio.

### Componente de Conteúdo:
- Criarei um `LessonContentViewer` (ou usarei o `BlockNoteView` em modo leitura) para exibir o material com excelente legibilidade.
- Tratamento para:
    - **Texto/Markdown**: Renderização rica via BlockNote.
    - **Mídia (Imagem/Vídeo/PDF)**: Uso dos renderizadores nativos do sistema.
    - **Sem Material**: Estado vazio explícito "Esta aula ainda não possui material".

## 3. Lógica de Conclusão e Progresso
- **Progresso**: Baseado na rolagem/leitura do documento ou tempo mínimo.
- **Botão Concluir**: Só habilitado após contato real com o material.
- **Pós-Sessão**: Tela de sucesso sugerindo "Testar memória" (Recuperação Ativa).

## 4. Persistência e Retomada
- Garantir que `nota` e `elapsed` continuem sendo salvos.
- O vínculo com `courseId` e `lessonId` já está funcional, mas vou reforçar a exibição dos nomes em vez de IDs.

## Detalhes Técnicos
- **Hook**: Usar `useLessonDocument(lessonId)` para buscar o conteúdo.
- **Componentes**: Reuso de `BlockNoteView` com `editable={false}` para o conteúdo.
- **Estilo**: Tema Graphite/Magenta, tipografia focada em leitura (largura máxima de ~700px para o texto).

---

Este plano foca na **experiência do estudante** como leitor, não apenas como anotador.
