/**
 * Helpers puros para montar a grade do mês. Trabalham só com strings YYYY-MM-DD
 * e números de dia — sem Date/fuso, para não introduzir bug de timezone. A
 * âncora de "hoje" vem sempre de civilDateInTimezone (perfil), no componente.
 */

export interface CalendarCell {
  /** YYYY-MM-DD do dia */
  date: string;
  /** dia do mês (1..31) */
  day: number;
  /** pertence ao mês exibido? (false = preenchimento das bordas) */
  inMonth: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function ymd(year: number, month1: number, day: number): string {
  return `${year}-${pad(month1)}-${pad(day)}`;
}

export function daysInMonth(year: number, month1: number): number {
  // month1: 1..12. Day 0 do mês seguinte = último dia do mês atual.
  return new Date(year, month1, 0).getDate();
}

/** Dia da semana (0=domingo) do primeiro dia do mês, sem depender de fuso local. */
export function firstWeekdayOfMonth(year: number, month1: number): number {
  return new Date(year, month1 - 1, 1).getDay();
}

/**
 * Constrói as 6 semanas (42 células) da grade, respeitando weekStartsOn (0=dom,1=seg).
 * Preenche bordas com dias do mês anterior/seguinte (inMonth=false).
 */
export function buildMonthGrid(
  year: number,
  month1: number,
  weekStartsOn: number,
): CalendarCell[] {
  const total = daysInMonth(year, month1);
  const firstWeekday = firstWeekdayOfMonth(year, month1);
  const lead = (firstWeekday - weekStartsOn + 7) % 7;

  const prevMonth = month1 === 1 ? 12 : month1 - 1;
  const prevYear = month1 === 1 ? year - 1 : year;
  const prevTotal = daysInMonth(prevYear, prevMonth);

  const nextMonth = month1 === 12 ? 1 : month1 + 1;
  const nextYear = month1 === 12 ? year + 1 : year;

  const cells: CalendarCell[] = [];

  for (let i = lead - 1; i >= 0; i--) {
    const d = prevTotal - i;
    cells.push({ date: ymd(prevYear, prevMonth, d), day: d, inMonth: false });
  }
  for (let d = 1; d <= total; d++) {
    cells.push({ date: ymd(year, month1, d), day: d, inMonth: true });
  }
  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({ date: ymd(nextYear, nextMonth, nextDay), day: nextDay, inMonth: false });
    nextDay++;
  }
  return cells;
}

export const WEEKDAY_LABELS_SUN = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Rótulos de cabeçalho reordenados conforme weekStartsOn. */
export function weekdayHeaders(weekStartsOn: number): string[] {
  return Array.from({ length: 7 }, (_, i) => WEEKDAY_LABELS_SUN[(weekStartsOn + i) % 7]!);
}
