import { describe, expect, it } from "vitest";

import { resolveTimezone, startOfDayIso, startOfWeekIso } from "./timezone";

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

describe("startOfWeekIso", () => {
  it("numa segunda-feira, retorna o próprio dia", () => {
    // 2026-01-26 é segunda-feira (UTC)
    const result = startOfWeekIso("UTC", new Date("2026-01-26T00:00:00.000Z"));
    expect(new Date(result).toISOString()).toBe("2026-01-26T00:00:00.000Z");
  });

  it("numa quarta-feira, volta para a segunda-feira daquela semana", () => {
    // 2026-01-28 é quarta-feira (UTC), semana começa em 2026-01-26
    const result = startOfWeekIso("UTC", new Date("2026-01-28T14:00:00.000Z"));
    expect(new Date(result).toISOString()).toBe("2026-01-26T00:00:00.000Z");
  });

  it("num domingo, volta para a segunda-feira anterior (fim da semana Mon-Sun)", () => {
    // 2026-08-02 é domingo (UTC), semana começa em 2026-07-27
    const result = startOfWeekIso("UTC", new Date("2026-08-02T14:00:00.000Z"));
    expect(new Date(result).toISOString()).toBe("2026-07-27T00:00:00.000Z");
  });

  it("virada de semana: domingo e a segunda seguinte caem em semanas diferentes", () => {
    const sunday = startOfWeekIso("UTC", new Date("2026-08-02T14:00:00.000Z"));
    const monday = startOfWeekIso("UTC", new Date("2026-08-03T14:00:00.000Z"));
    expect(sunday).not.toBe(monday);
    expect(new Date(monday).toISOString()).toBe("2026-08-03T00:00:00.000Z");
  });

  it("virada de mês: domingo 1º de fevereiro pertence à semana que começou em janeiro", () => {
    // 2026-02-01 é domingo (UTC), semana começa em 2026-01-26 (ainda janeiro)
    const result = startOfWeekIso("UTC", new Date("2026-02-01T14:00:00.000Z"));
    expect(new Date(result).toISOString()).toBe("2026-01-26T00:00:00.000Z");
  });

  it("respeita o fuso informado (America/Sao_Paulo, UTC-3)", () => {
    // 2026-01-26T02:00:00Z é 2026-01-25 23:00 em São Paulo — ainda domingo lá
    const result = startOfWeekIso("America/Sao_Paulo", new Date("2026-01-26T02:00:00.000Z"));
    // domingo em São Paulo -> semana começou na segunda anterior, 2026-01-19 00:00 -03:00
    expect(new Date(result).toISOString()).toBe("2026-01-19T03:00:00.000Z");
  });

  it("cai para o fuso padrão em timezone inválido, sem lançar", () => {
    const ref = new Date("2026-01-28T14:00:00.000Z");
    expect(() => startOfWeekIso("Not/AZone", ref)).not.toThrow();
    expect(startOfWeekIso("Not/AZone", ref)).toBe(startOfWeekIso(undefined, ref));
  });
});
