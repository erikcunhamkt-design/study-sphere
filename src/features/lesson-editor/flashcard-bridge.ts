import { createContext, useContext } from "react";

import type { FlashcardContent } from "@/features/flashcards/schema";
import type { DocumentAnchor } from "./document-anchor";

/**
 * Ponte estreita entre o editor da aula/curso e o recurso de flashcards da
 * Fase 04, sem acoplar os dois pacotes de features um no outro
 * diretamente. O item "Criar flashcard" do side menu (renderizado por
 * dentro do BlockNoteView, possivelmente via portal) precisa acionar um
 * diálogo que vive em LessonEditorLoaded — Context é o jeito idiomático
 * de atravessar essa fronteira sem depender de threading de props por
 * um render-prop do BlockNote que não controlamos (dragHandleMenu).
 *
 * `import type` aqui não tem custo de bundle (apagado na compilação) —
 * diferente do erro corrigido no Gate 3 (importar um VALOR de
 * document-schema.ts vazava o BlockNote inteiro para o chunk de
 * flashcards). Tipo é seguro nos dois sentidos.
 */
export interface FlashcardBridgeValue {
  anchor: DocumentAnchor;
  onCreateFlashcard: (params: {
    sourceBlockId: string;
    frontText: string;
    /** Conteúdo inline rico original do bloco, quando validável como FlashcardContent; null se não. */
    frontContent: FlashcardContent | null;
  }) => void;
}

export const FlashcardBridgeContext = createContext<FlashcardBridgeValue | null>(null);

export function useFlashcardBridge() {
  return useContext(FlashcardBridgeContext);
}
