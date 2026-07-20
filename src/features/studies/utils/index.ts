import {
  BookOpen,
  Briefcase,
  Brain,
  Calculator,
  Code2,
  FlaskConical,
  Globe2,
  GraduationCap,
  Landmark,
  Languages,
  Megaphone,
  Palette,
  type LucideIcon,
} from "lucide-react";

import type { ArchiveFilter, Course, CourseStatus, StudyArea, StudyAreaColor } from "../types";

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  Megaphone,
  Landmark,
  Brain,
  Palette,
  Code2,
  Languages,
  Calculator,
  Briefcase,
  GraduationCap,
  FlaskConical,
  Globe2,
};

const FALLBACK_ICON: LucideIcon = BookOpen;

/** Nunca deixa um valor desconhecido (dado corrompido, versão antiga) quebrar a renderização. */
export function resolveAreaIcon(icon: string | null | undefined): LucideIcon {
  if (!icon) return FALLBACK_ICON;
  return ICON_MAP[icon] ?? FALLBACK_ICON;
}

interface ColorTokens {
  /** Chip/badge de identificação da área (fundo suave + texto). */
  chip: string;
  /** Círculo sólido usado no seletor de cor. */
  dot: string;
  /** Contorno usado no card quando a cor precisa aparecer discretamente. */
  ring: string;
}

const COLOR_TOKENS: Record<StudyAreaColor, ColorTokens> = {
  magenta: {
    chip: "bg-fuchsia-500/10 text-fuchsia-700 dark:bg-fuchsia-400/10 dark:text-fuchsia-300",
    dot: "bg-fuchsia-500",
    ring: "ring-fuchsia-500/30",
  },
  violet: {
    chip: "bg-violet-500/10 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300",
    dot: "bg-violet-500",
    ring: "ring-violet-500/30",
  },
  blue: {
    chip: "bg-blue-500/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300",
    dot: "bg-blue-500",
    ring: "ring-blue-500/30",
  },
  cyan: {
    chip: "bg-cyan-500/10 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300",
    dot: "bg-cyan-500",
    ring: "ring-cyan-500/30",
  },
  emerald: {
    chip: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/30",
  },
  amber: {
    chip: "bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    dot: "bg-amber-500",
    ring: "ring-amber-500/30",
  },
  orange: {
    chip: "bg-orange-500/10 text-orange-700 dark:bg-orange-400/10 dark:text-orange-300",
    dot: "bg-orange-500",
    ring: "ring-orange-500/30",
  },
  rose: {
    chip: "bg-rose-500/10 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
    dot: "bg-rose-500",
    ring: "ring-rose-500/30",
  },
  slate: {
    chip: "bg-slate-500/10 text-slate-700 dark:bg-slate-400/10 dark:text-slate-300",
    dot: "bg-slate-500",
    ring: "ring-slate-500/30",
  },
};

const FALLBACK_COLOR_TOKENS = COLOR_TOKENS.slate;

/** Mesma filosofia de fallback do ícone: nunca deixa uma cor desconhecida quebrar a UI. */
export function resolveAreaColorTokens(color: string | null | undefined): ColorTokens {
  if (!color) return FALLBACK_COLOR_TOKENS;
  return COLOR_TOKENS[color as StudyAreaColor] ?? FALLBACK_COLOR_TOKENS;
}

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  not_started: "Não iniciado",
  in_progress: "Em andamento",
  completed: "Concluído",
};

export const COURSE_STATUS_BADGE_VARIANT: Record<
  CourseStatus,
  "secondary" | "default" | "outline"
> = {
  not_started: "secondary",
  in_progress: "default",
  completed: "outline",
};

export function sortByPosition<T extends { position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position);
}

export function filterByArchiveState<T extends { is_archived: boolean }>(
  items: T[],
  filter: ArchiveFilter,
): T[] {
  if (filter === "active") return items.filter((i) => !i.is_archived);
  if (filter === "archived") return items.filter((i) => i.is_archived);
  return items;
}

/**
 * Posição para "colocar no final da lista ativa" — usada tanto ao criar
 * (a nova linha nasce ativa) quanto ao restaurar (a linha volta a ficar
 * ativa) um item. Ignora linhas arquivadas de propósito: como
 * `reorder_study_areas`/`reorder_courses` só aceitam o conjunto completo
 * de linhas ATIVAS, uma posição calculada sobre todas as linhas (incluindo
 * arquivadas) poderia ficar mais alta que o necessário, mas nunca mais
 * baixa — o valor exato não importa para a ordenação (o próximo reorder
 * reescreve 0..N-1), só precisa ser >= à maior posição ativa atual para
 * aparecer no fim da lista visível.
 */
export function nextActivePosition<T extends { position: number; is_archived: boolean }>(
  items: T[],
): number {
  const active = items.filter((i) => !i.is_archived);
  if (active.length === 0) return 0;
  return Math.max(...active.map((i) => i.position)) + 1;
}

export type ReorderRejectionReason =
  "empty-but-not-empty" | "duplicate" | "invalid-ids" | "incomplete-set";

export type ReorderValidation = { valid: true } | { valid: false; reason: ReorderRejectionReason };

export const REORDER_REJECTION_MESSAGES: Record<ReorderRejectionReason, string> = {
  "empty-but-not-empty": "A lista não pode ficar vazia enquanto existirem itens ativos.",
  duplicate: "A lista contém itens duplicados.",
  "invalid-ids":
    "A lista contém itens que não pertencem a este conjunto (arquivados, de outro usuário/área, ou inexistentes).",
  "incomplete-set":
    "A lista precisa conter todos os itens ativos — não é possível reordenar um subconjunto.",
};

/**
 * Espelha, no cliente, a mesma validação de "conjunto completo" que
 * `reorder_study_areas`/`reorder_courses` fazem no banco (ver a migration
 * `20260719140000_fase02_1_study_areas_and_courses.sql`) — não é um
 * substituto da validação do banco (RLS + a própria função continuam
 * sendo a fonte de verdade e a única barreira contra requisições diretas),
 * é uma camada extra que dá um erro imediato, sem round-trip de rede,
 * caso o cliente algum dia calcule `providedIds` errado.
 */
export function validateReorderIds(
  providedIds: string[],
  expectedIds: string[],
): ReorderValidation {
  const expectedSet = new Set(expectedIds);

  if (providedIds.length === 0) {
    return expectedSet.size === 0
      ? { valid: true }
      : { valid: false, reason: "empty-but-not-empty" };
  }

  const distinct = new Set(providedIds);
  if (distinct.size !== providedIds.length) {
    return { valid: false, reason: "duplicate" };
  }

  const allProvidedAreValid = providedIds.every((id) => expectedSet.has(id));
  if (!allProvidedAreValid) {
    return { valid: false, reason: "invalid-ids" };
  }

  if (distinct.size !== expectedSet.size) {
    return { valid: false, reason: "incomplete-set" };
  }

  return { valid: true };
}

/**
 * Um curso só é válido dentro da rota /app/estudos/$areaId/cursos/$courseId
 * se ele existir E pertencer à área da própria URL — sem essa segunda
 * checagem, trocar o segmento $areaId na barra de endereço por qualquer
 * outra área (inclusive uma que não seja sua) mostraria um curso de outra
 * área como se fosse desta.
 */
export function isCourseOutsideArea(
  course: Pick<Course, "study_area_id"> | null | undefined,
  areaId: string,
): boolean {
  return !course || course.study_area_id !== areaId;
}

/** Espelha a regra de confirmação de exclusão de área: só exige digitar o nome quando há cursos. */
export function canConfirmAreaDeletion(
  areaName: string,
  courseCount: number,
  confirmText: string,
): boolean {
  if (courseCount <= 0) return true;
  return confirmText.trim() === areaName;
}

export function matchesSearch(text: string, query: string): boolean {
  if (!query.trim()) return true;
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

export function searchStudyAreas<T extends Pick<StudyArea, "name" | "description">>(
  areas: T[],
  query: string,
): T[] {
  if (!query.trim()) return areas;
  return areas.filter(
    (a) => matchesSearch(a.name, query) || matchesSearch(a.description ?? "", query),
  );
}

export function searchCourses<T extends Pick<Course, "name" | "description">>(
  courses: T[],
  query: string,
): T[] {
  if (!query.trim()) return courses;
  return courses.filter(
    (c) => matchesSearch(c.name, query) || matchesSearch(c.description ?? "", query),
  );
}
