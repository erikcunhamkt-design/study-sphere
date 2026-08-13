---
name: Dominus Navigation & Sidebar Architecture
description: Strategic guidelines for the sidebar and navigation architecture of DominusApp.
type: reference
---
# Dominus Navigation: Arquitetura e Sidebar

## Diagnóstico e Visão
A sidebar não é um simples menu; é a **arquitetura mental do Dominus**. Ela deve transformar o app de um dashboard genérico em um **cockpit de aprendizagem**.

## Princípios de Navegação
- **Arquitetura Lógica**: APRENDER → CONTEÚDO → ORGANIZAR → PROGRESSO.
- **Diferenciação Semântica**: "Estudar" (Ação agora) vs. "Meus Estudos" (Acervo/Conteúdo).
- **Curadoria vs. Excesso**: Mostrar o que o usuário precisa encontrar, não tudo o que o produto possui.
- **Sensação Premium**: Minimalismo, contraste controlado, magenta como sinal de estado e não preenchimento.

## Nova Arquitetura de Sidebar

### 1. PRINCIPAL
- **Início**: Ponto de partida e cockpit.

### 2. APRENDER (O que eu faço agora)
- **Estudar**: Sessão de estudo, recomendações, próximo conteúdo.
- **Revisar**: Fila de SM-2 e Active Recall (integrado ou seção própria conforme uso).

### 3. CONTEÚDO (O que estou aprendendo)
- **Meus estudos**: Trilhas, cursos, disciplinas ativas.
- **Biblioteca**: Acervo de materiais, PDFs e links (integrável a 'Meus Estudos' se secundário).

### 4. ORGANIZAÇÃO
- **Planejamento**: Agenda e metas estratégicas.

### 5. PROGRESSO
- **Desempenho**: Domínio cognitivo e evolução real (não apenas horas).

### 6. SISTEMA (Parte Inferior)
- **Configurações**
- **Perfil (Avatar)**: Menu contextual para Perfil, Plano e Sair.

## Comportamento Visual
- **Ativo**: Fundo sutil + indicador lateral + detalhe magenta leve.
- **Expandida**: Ícone + Nome + Agrupamento.
- **Recolhida**: Apenas ícones com tooltips contextuais.
- **Dinâmica**: Revelar sub-itens contextuais (ex: sessão atual) apenas quando relevante.

## Regras de Nomenclatura
- ✅ **Estudar** (Ação)
- ✅ **Meus estudos** (Conteúdo)
- ❌ **Estudos** (Ambíguo)
