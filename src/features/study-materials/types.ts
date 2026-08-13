import type { Database } from "@/integrations/supabase/types";

export type StudyMaterialRow = Database["public"]["Tables"]["study_materials"]["Row"];
export type StudyMaterialInsert = Database["public"]["Tables"]["study_materials"]["Insert"];
export type StudyMaterialUpdate = Database["public"]["Tables"]["study_materials"]["Update"];

export type StudyMaterialType = StudyMaterialRow["type"];
