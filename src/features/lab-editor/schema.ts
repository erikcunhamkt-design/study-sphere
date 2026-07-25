import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";

import { calloutBlock } from "./callout-block";

/**
 * Prova técnica (Fase 03.0): schema restrito aos blocos autorizados no
 * escopo do laboratório. Divisor é nativo (defaultBlockSpecs.divider);
 * callout é o único bloco custom necessário. Imagem, vídeo, áudio,
 * arquivo e tabela ficam de fora deliberadamente.
 */
const {
  audio: _audio,
  file: _file,
  image: _image,
  table: _table,
  video: _video,
  ...allowedDefaultBlockSpecs
} = defaultBlockSpecs;

export const labEditorSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...allowedDefaultBlockSpecs,
    callout: calloutBlock(),
  },
});

export type LabEditorSchema = typeof labEditorSchema;
