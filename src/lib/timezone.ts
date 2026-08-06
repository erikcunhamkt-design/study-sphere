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

/**
 * Data civil de hoje (YYYY-MM-DD) no fuso informado — para comparar com colunas
 * DATE (ex.: planned_studies.scheduled_date), que são dia civil sem fuso.
 * "Hoje" é sempre relativo a profile.timezone, nunca ao relógio do dispositivo
 * (mesma decisão da Fase 05.2).
 */
export function civilDateInTimezone(
  timezone: string | null | undefined,
  referenceDate = new Date(),
): string {
  const tz = resolveTimezone(timezone);
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(referenceDate);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return civilDateInTimezone(DEFAULT_TIMEZONE, referenceDate);
  }
}
