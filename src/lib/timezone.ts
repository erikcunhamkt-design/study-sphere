const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/** profile.timezone pode vir vazio (perfil recém-criado) — mesmo fallback usado no dashboard. */
export function resolveTimezone(timezone?: string | null): string {
  return timezone || DEFAULT_TIMEZONE;
}

function normalizeOffset(raw: string): string {
  const match = /^([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(raw);
  if (!match) return "+00:00";
  const [, sign, hours, minutes] = match;
  return `${sign}${hours!.padStart(2, "0")}:${(minutes ?? "00").padStart(2, "0")}`;
}

/**
 * Início do dia (00:00) no fuso informado, como instante UTC real (ISO com
 * offset) — não no fuso do navegador. Usa Intl.DateTimeFormat com
 * timeZoneName "longOffset" para ler o offset efetivo do fuso na data de
 * referência (cobre DST corretamente, sem depender de biblioteca de datas).
 * Decisão do Gate 1 da Fase 05.2: "hoje" é sempre relativo a profile.timezone,
 * nunca ao relógio local do dispositivo.
 */
export function startOfDayIso(
  timezone: string | null | undefined,
  referenceDate = new Date(),
): string {
  const tz = resolveTimezone(timezone);
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZoneName: "longOffset",
    }).formatToParts(referenceDate);

    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const year = get("year");
    const month = get("month");
    const day = get("day");
    const offset = normalizeOffset(get("timeZoneName").replace("GMT", "") || "+00:00");

    return `${year}-${month}-${day}T00:00:00${offset}`;
  } catch {
    // Fuso inválido/desconhecido: mesmo fallback silencioso de greetingForNow.
    return startOfDayIso(DEFAULT_TIMEZONE, referenceDate);
  }
}

// Segunda=0 .. domingo=6 — ordem usada para achar quantos dias voltar até a segunda.
const WEEKDAY_MONDAY_FIRST = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Início da semana (segunda-feira, 00:00) no fuso informado, como instante
 * UTC real — mesma técnica de startOfDayIso, recalculada dia a dia (não por
 * subtração de milissegundos) para não acumular erro em fusos com DST.
 * Decisão do Gate 1 da Fase 06: semana sempre começa na segunda, no dia
 * civil de profile.timezone.
 */
export function startOfWeekIso(
  timezone: string | null | undefined,
  referenceDate = new Date(),
): string {
  const tz = resolveTimezone(timezone);
  let weekdayShort: string;
  try {
    weekdayShort = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(
      referenceDate,
    );
  } catch {
    return startOfWeekIso(DEFAULT_TIMEZONE, referenceDate);
  }
  const daysSinceMonday = Math.max(0, WEEKDAY_MONDAY_FIRST.indexOf(weekdayShort));
  const mondayReference = new Date(referenceDate.getTime() - daysSinceMonday * 86_400_000);
  return startOfDayIso(tz, mondayReference);
}
