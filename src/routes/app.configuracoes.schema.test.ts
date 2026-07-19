import { describe, expect, it } from "vitest";

import { prefsSchema } from "./app.configuracoes";

const VALID = {
  daily_study_goal_minutes: 60,
  week_starts_on: 1,
  pomodoro_focus_minutes: 25,
  pomodoro_short_break_minutes: 5,
  pomodoro_long_break_minutes: 15,
  pomodoro_cycles: 4,
};

describe("prefsSchema (validação das preferências de estudo)", () => {
  it("aceita os valores padrão", () => {
    expect(prefsSchema.safeParse(VALID).success).toBe(true);
  });

  it.each([
    ["daily_study_goal_minutes", 0],
    ["daily_study_goal_minutes", -5],
    ["daily_study_goal_minutes", 1441],
    ["pomodoro_focus_minutes", 0],
    ["pomodoro_focus_minutes", 241],
    ["pomodoro_short_break_minutes", 0],
    ["pomodoro_short_break_minutes", 121],
    ["pomodoro_long_break_minutes", 0],
    ["pomodoro_long_break_minutes", 241],
    ["pomodoro_cycles", 0],
    ["pomodoro_cycles", 21],
  ] as const)("rejeita %s = %i (fora dos limites do CHECK do banco)", (field, value) => {
    const r = prefsSchema.safeParse({ ...VALID, [field]: value });
    expect(r.success).toBe(false);
  });

  it("aceita os limites exatos (1 e o teto de cada campo)", () => {
    expect(
      prefsSchema.safeParse({
        daily_study_goal_minutes: 1,
        week_starts_on: 0,
        pomodoro_focus_minutes: 240,
        pomodoro_short_break_minutes: 120,
        pomodoro_long_break_minutes: 240,
        pomodoro_cycles: 20,
      }).success,
    ).toBe(true);
  });

  it("rejeita valores não inteiros", () => {
    expect(prefsSchema.safeParse({ ...VALID, pomodoro_cycles: 4.5 }).success).toBe(false);
  });
});
