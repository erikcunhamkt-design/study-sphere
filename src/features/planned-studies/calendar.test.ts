import { describe, expect, it } from "vitest";

import { buildMonthGrid, daysInMonth, ymd, weekdayHeaders } from "./calendar";

describe("calendar helpers", () => {
  it("conta dias do mês corretamente (fevereiro bissexto)", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2025, 2)).toBe(28);
    expect(daysInMonth(2026, 4)).toBe(30);
  });

  it("ymd formata com zero à esquerda", () => {
    expect(ymd(2026, 3, 5)).toBe("2026-03-05");
  });

  it("grade tem sempre 42 células e o mês certo no meio", () => {
    const grid = buildMonthGrid(2026, 8, 0); // agosto/2026, semana começando domingo
    expect(grid).toHaveLength(42);
    const inMonth = grid.filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(31);
    expect(inMonth[0]!.date).toBe("2026-08-01");
    expect(inMonth[inMonth.length - 1]!.date).toBe("2026-08-31");
  });

  it("respeita weekStartsOn=1 (segunda) reordenando cabeçalhos", () => {
    expect(weekdayHeaders(1)[0]).toBe("Seg");
    expect(weekdayHeaders(0)[0]).toBe("Dom");
  });
});
