# Plano: Biblioteca — Fatia 2: Materiais de Referência (Revisado)

## 1. Visão Geral
Adicionar a capacidade de gerenciar **Materiais de Referência** (links externos) na Biblioteca. Materiais são exclusivamente referências (URLs), sem armazenamento de arquivos físicos no backend (eliminando custos de storage e complexidade de upload).

## 2. Schema do Banco de Dados (`public.study_materials`)

### Tabela
```sql
CREATE TABLE public.study_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  type text NOT NULL, -- enum: 'pdf', 'video', 'artigo', 'link', 'livro', 'outro'
  note text,
  course_id uuid, -- FK composta com user_id
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- FK Composta para garantir que o curso pertence ao usuário
  CONSTRAINT study_materials_course_fkey 
    FOREIGN KEY (course_id, user_id) 
    REFERENCES public.courses(id, user_id) 
    ON DELETE SET NULL, -- Se o curso for deletado, mantemos o material como "avulso"

  -- CHECKs de integridade
  CONSTRAINT study_materials_title_check CHECK (btrim(title) <> '' AND char_length(title) <= 255),
  CONSTRAINT study_materials_url_check CHECK (btrim(url) <> '' AND char_length(url) <= 2048),
  CONSTRAINT study_materials_type_check CHECK (type IN ('pdf', 'video', 'artigo', 'link', 'livro', 'outro')),
  CONSTRAINT study_materials_note_check CHECK (note IS NULL OR char_length(note) <= 2000)
);

-- Índices
CREATE INDEX study_materials_user_id_idx ON public.study_materials (user_id);
CREATE INDEX study_materials_user_archived_idx ON public.study_materials (user_id, is_archived);
CREATE INDEX study_materials_course_idx ON public.study_materials (user_id, course_id);

-- RLS & Permissões
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_materials_select_own" ON public.study_materials
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "study_materials_insert_own" ON public.study_materials
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "study_materials_update_own" ON public.study_materials
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "study_materials_delete_own" ON public.study_materials
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_materials TO authenticated;
GRANT ALL ON public.study_materials TO service_role;

-- Trigger updated_at
CREATE TRIGGER set_study_materials_updated_at
  BEFORE UPDATE ON public.study_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
```

### Justificativa de `ON DELETE SET NULL` no `course_id`:
Diferente de Flashcards/Questões que muitas vezes perdem o sentido sem o contexto da Aula/Curso, um **Material de Referência** (como um livro em PDF ou um vídeo base) é um ativo de conhecimento perene. Se o usuário deletar o curso, o link original ainda é valioso e deve permanecer acessível na Biblioteca Geral como um item "avulso".

## 3. Interface e Fluxo (UI/UX)

### Aba na Biblioteca
- Adição da aba **"Materiais"** em `/app/biblioteca`.
- A aba exibe a lista de materiais do usuário. A listagem principal da biblioteca mostra materiais "avulsos" (`course_id IS NULL`) ou todos, dependendo do filtro selecionado.
- **Cards de Material**: Título, ícone representativo do tipo, indicação do curso vinculado (se houver), e ações (Editar, Arquivar, Abrir Link).

### Componentes a Criar/Modificar
1.  **`MaterialFormDialog`**: Formulário para criação/edição.
    - Campos: Título (Input), URL (Input/URL), Tipo (Select/Dropdown), Curso (Select/Combobox opcional), Nota (Textarea).
    - Validação: Zod no cliente (URL válida, Título obrigatório).
2.  **`MaterialList`**: Componente de listagem com busca e filtros.
3.  **`MaterialItem`**: Componente de linha/card para cada material.

### Ações
- **Abrir Link**: Sempre `window.open(url, '_blank', 'noopener,noreferrer')`.

## 4. Fatiamento Proposto

**Sub-fatia 2.1: Fundação & Biblioteca**
- Migration da tabela `study_materials`.
- API e Hooks (`useStudyMaterials`, `useCreateMaterial`, etc.).
- Implementação da aba "Materiais" na `/app/biblioteca` com CRUD completo.

**Sub-fatia 2.2: Contexto do Curso**
- Exibição de materiais vinculados dentro da página de detalhes do curso.
- Filtro por curso na listagem da biblioteca.

## 5. Conformidade
- Segue o padrão de RLS do projeto (Fase 01/06).
- Zero dependência de storage externo (links apenas).
- Reuso de padrões Shadcn/UI (Tabs, Dialogs, Forms).

---
*Este é um documento de planejamento. Nenhuma alteração no código fonte foi realizada.*