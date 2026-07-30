import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";

import { calloutBlock } from "@/features/lab-editor/callout-block";
import { bookmarkBlock } from "./bookmark-block";
import { studyBlock } from "./study-block";
import { tocBlock } from "./toc-block";

/**
 * Schema do caderno da aula.
 * Fase 03.1: blocos de texto/estrutura + callout (herdados da prova 03.0).
 * Fase 03.2: mídia nativa (imagem, arquivo, vídeo, áudio), tabela simples,
 * bookmark e índice. Colunas ficaram FORA por decisão de licença — o
 * bloco multi-coluna oficial vive em @blocknote/xl-* (GPL-3.0), vetado
 * desde a auditoria da Fase 03.0; nenhum pacote xl-* pode ser adicionado.
 * Fase 03.3: bloco de estudo com o vocabulário acadêmico (13 variantes em
 * props.kind); o callout genérico permanece por compatibilidade.
 */
export const lessonEditorSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    callout: calloutBlock(),
    bookmark: bookmarkBlock(),
    tableOfContents: tocBlock(),
    studyBlock: studyBlock(),
  },
});

export type LessonEditorSchema = typeof lessonEditorSchema;
