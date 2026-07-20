export const STUDY_AREA_COLORS = [
  "magenta",
  "violet",
  "blue",
  "cyan",
  "emerald",
  "amber",
  "orange",
  "rose",
  "slate",
] as const;

export type StudyAreaColor = (typeof STUDY_AREA_COLORS)[number];

export const STUDY_AREA_ICONS = [
  "BookOpen",
  "Megaphone",
  "Landmark",
  "Brain",
  "Palette",
  "Code2",
  "Languages",
  "Calculator",
  "Briefcase",
  "GraduationCap",
  "FlaskConical",
  "Globe2",
] as const;

export type StudyAreaIconName = (typeof STUDY_AREA_ICONS)[number];

export const COURSE_STATUSES = ["not_started", "in_progress", "completed"] as const;

export type CourseStatus = (typeof COURSE_STATUSES)[number];

export type ArchiveFilter = "active" | "archived" | "all";

export interface StudyArea {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  position: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  user_id: string;
  study_area_id: string;
  name: string;
  description: string | null;
  status: CourseStatus;
  position: number;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudyAreaWithCounts extends StudyArea {
  courseCount: number;
  inProgressCount: number;
}

export interface CreateStudyAreaInput {
  name: string;
  description?: string | null;
  icon: StudyAreaIconName;
  color: StudyAreaColor;
}

export interface UpdateStudyAreaInput {
  name?: string;
  description?: string | null;
  icon?: StudyAreaIconName;
  color?: StudyAreaColor;
  is_archived?: boolean;
  /** Só usado ao restaurar (ver useRestoreStudyArea) — reposiciona no final da lista ativa. */
  position?: number;
}

export interface CreateCourseInput {
  study_area_id: string;
  name: string;
  description?: string | null;
  status?: CourseStatus;
}

export interface UpdateCourseInput {
  name?: string;
  description?: string | null;
  status?: CourseStatus;
  is_favorite?: boolean;
  is_archived?: boolean;
  /** Só usado ao restaurar (ver useRestoreCourse) — reposiciona no final da lista ativa da área. */
  position?: number;
}
