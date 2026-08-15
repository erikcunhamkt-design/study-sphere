import { createContext, useContext } from "react";
export const FlashcardBridgeContext = createContext(null);
export function useFlashcardBridge() {
    return useContext(FlashcardBridgeContext);
}
