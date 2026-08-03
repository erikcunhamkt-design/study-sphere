import type { StudyMethod } from "@/features/study-sessions/types";

export type WindowDays = 7 | 30 | 90;

export interface DayMinutes {
  /** Chave do bucket — início do dia civil (mesmo formato de startOfDayIso). */
  bucketStartIso: string;
  label: string;
  minutes: number;
}

export interface AccuracyBucket {
  /** Chave do bucket — início do dia ou da semana civil, conforme a janela. */
  bucketStartIso: string;
  label: string;
  /** null = nenhuma resposta nesse bucket (gap real, não fabricado). */
  accuracyPct: number | null;
  total: number;
}

export interface MethodMinutes {
  method: StudyMethod;
  minutes: number;
}

export interface AreaSignal {
  pct: number;
  total: number;
}

export interface AreaDomainResult {
  areaId: string;
  /** Sinal preferencial: acerto em questões da área. */
  questionAccuracy: AreaSignal | null;
  /** Sinal alternativo, só preenchido quando questionAccuracy é null (área sem questões suficientes). */
  flashcardRetention: AreaSignal | null;
}

export interface DomainByAreaResult {
  byArea: AreaDomainResult[];
  /** Áreas com atividade mas abaixo do MIN_SAMPLE em ambos os sinais — não somem, aparecem aqui. */
  insufficientAreaIds: string[];
}
