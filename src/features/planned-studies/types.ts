export const PLANNED_STATUS_VALUES = ["planned", "completed", "skipped"] as const;
export type PlannedStatus = (typeof PLANNED_STATUS_VALUES)[number];

export interface PlannedStudyRow {
  id: string;
  user_id: string;
  title: string;
  scheduled_date: string; // YYYY-MM-DD (coluna DATE, dia civil)
  study_area_id: string | null;
  course_id: string | null;
  estimated_minutes: number | null;
  status: PlannedStatus;
  study_session_id: string | null;
  created_at: string;
  updated_at: string;
}
