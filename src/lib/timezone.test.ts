import { describe, expect, it } from "vitest";

import { resolveTimezone, startOfDayIso } from "./timezone";

describe("resolveTimezone", () => {
  it("usa o fuso informado quando presente", () => {
    expect(resolveTimezone("UTC")).toBe("UTC");
  });

  it("cai para America/Sao_Paulo quando vazio/nulo/indefinido", () => {
    expect(resolveTimezone(null)).toBe("America/Sao_Paulo");
    expect(resolveTimezone(undefined)).toBe("America/Sao_Paulo");
    expect(resolveTimezone("")).toBe("America/Sao_Paulo");
  });
});

describe("startOfDayIso", () => {
  it("calcula meia-noite em UTC", () => {
    const result = startOfDayIso("UTC", new Date("2026-08-02T14:30:00.000Z"));
    expect(new Date(result).toISOString()).toBe("2026-08-02T00:00:00.000Z");
  });

  it("calcula meia-noite em America/Sao_Paulo (UTC-3, sem horário de verão)", () => {
    const result = startOfDayIso("America/Sao_Paulo", new Date("2026-08-02T14:30:00.000Z"));
    expect(new Date(result).toISOString()).toBe("2026-08-02T03:00:00.000Z");
  });

  it("usa o dia civil correto do fuso perto da virada de meia-noite UTC (o motivo de existir)", () => {
    // 02:00 UTC ainda é 23:00 do dia 1 em São Paulo — se calculasse o "dia"
    // em UTC (ou no fuso do navegador rodando em outro fuso), o início do
    // dia sairia errado por até algumas horas.
    const result = startOfDayIso("America/Sao_Paulo", new Date("2026-08-02T02:00:00.000Z"));
    expect(new Date(result).toISOString()).toBe("2026-08-01T03:00:00.000Z");
  });

  it("cai para o fuso padrão em timezone inválido, sem lançar", () => {
    const ref = new Date("2026-08-02T14:30:00.000Z");
    const invalid = startOfDayIso("Not/AZone", ref);
    const fallback = startOfDayIso(undefined, ref);
    expect(invalid).toBe(fallback);
  });
});
