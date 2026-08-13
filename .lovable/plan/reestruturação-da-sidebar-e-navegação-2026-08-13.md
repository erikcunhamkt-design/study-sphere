---
name: Sidebar & Navigation Relaunch
description: Plan for the complete re-architecture of the DominusApp sidebar and navigation flow.
type: feature
---
# Reestruturação da Sidebar e Navegação

## Arquitetura de Navegação
A navegação será reorganizada para refletir a jornada do usuário em quatro blocos lógicos: APRENDER (ação), CONTEÚDO (acervo), ORGANIZAÇÃO (estratégia) e PROGRESSO (evolução).

## Alterações Estruturais
- **Remoção**: O item "Estudos" será completamente removido para evitar ambiguidade com "Estudar".
- **Novos Itens**:
  - **Revisar**: Foco exclusivo em Active Recall / SM-2.
  - **Meus estudos**: Local para gerenciar cursos e trilhas de aprendizagem.
- **Hierarquia Visual**: Introdução de grupos com micro-títulos discretos na sidebar.

## Design e UX
- **Fundo**: Integrado e premium, sem bordas excessivas.
- **Estado Ativo**: Sofisticado, usando fundo sutil, indicador lateral magenta e tipografia enfatizada.
- **Footer**: Área de perfil consolidada em um único componente com menu dropdown contendo Perfil, Configurações e Sair.
- **Responsive**: Ajuste no MobileNav para refletir a nova hierarquia simplificada.

## Mapeamento de Itens
1. **PRINCIPAL**
   - Início (`/app`)
2. **APRENDER**
   - Estudar (`/app/estudar`)
   - Revisar (`/app/revisar` ou link para hub de revisão)
3. **CONTEÚDO**
   - Meus estudos (`/app/meus-estudos` - *Novo*)
   - Biblioteca (`/app/biblioteca`)
4. **ORGANIZAÇÃO**
   - Planejamento (`/app/planejamento`)
5. **PROGRESSO**
   - Desempenho (`/app/desempenho`)
6. **SISTEMA**
   - Configurações (`/app/configuracoes`)
   - Perfil (Avatar/Erik Cunha)

## Implementação Técnica
- Atualizar `NAV_ITEMS` e a lógica de renderização em `src/components/layout/navigation.tsx`.
- Refatorar `SidebarFooter` para consolidar perfil e sair.
- Garantir persistência de estado (expandido/recolhido) e tooltips precisos.
