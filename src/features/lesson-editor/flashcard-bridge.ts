import { createContext, useContext } from "react";

/**
 * Ponte estreita entre o editor da aula e o recurso de flashcards da
 * Fase 04, sem acoplar os dois pacotes de features um no outro
 * diretamente. O item "Criar flashcard" do side menu (renderizado por
 * dentro do BlockNoteView, possivelmente via portal) precisa acionar um
 * diálogo que vive em LessonEditorLoaded — Context é o jeito idiomático
 * de atravessar essa fronteira sem depender de threading de props por
 * um render-prop do BlockNote que não controlamos (dragHandleMenu).
 */
export interface FlashcardBridgeValue {
  lessonId: string;
  onCreateFlashcard: (params: { sourceBlockId: string; frontText: string }) => void;
}

export const FlashcardBridgeContext = createContext<FlashcardBridgeValue | null>(null);

export function useFlashcardBridge() {
  return useContext(FlashcardBridgeContext);
}
