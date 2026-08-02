import { useEffect } from "react";

/**
 * Aviso nativo do navegador ao fechar/recarregar a aba com texto não
 * salvo — não é autosave (residual aceito e documentado: Feynman/
 * Blurting/Cornell/Livre não recuperam texto de uma aba fechada). Barato
 * o bastante para não pular esta fase.
 */
export function useUnsavedTextWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}
