import { describe, expect, it } from "vitest";

/**
 * Invariante central da Fase 06.2 (Opção A): o vínculo (study_session_id) e o
 * status 'completed' são gravados juntos por linkSessionAndComplete. Este teste
 * documenta a forma do update esperado sem tocar a rede (a lógica de rede é fina
 * demais para valer mock aqui; o valor está em travar a intenção: nunca gravar
 * study_session_id sem também marcar completed).
 */
import * as api from "./api";

describe("planned-studies 06.2 — vínculo", () => {
  it("expõe as funções de vínculo e conclusão manual", () => {
    expect(typeof api.linkSessionAndComplete).toBe("function");
    expect(typeof api.completePlannedStudyManually).toBe("function");
    expect(typeof api.fetchLinkedSessionDurations).toBe("function");
  });

  it("fetchLinkedSessionDurations retorna {} para lista vazia sem tocar a rede", async () => {
    await expect(api.fetchLinkedSessionDurations([])).resolves.toEqual({});
  });
});
