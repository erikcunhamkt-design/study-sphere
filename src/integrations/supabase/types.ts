export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
          position: number
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_user_fkey"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "course_modules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          is_favorite: boolean
          name: string
          position: number
          status: string
          study_area_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          name: string
          position: number
          status?: string
          study_area_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          name?: string
          position?: number
          status?: string
          study_area_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_study_area_user_fkey"
            columns: ["study_area_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_areas"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "courses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          duration_seconds: number | null
          ended_at: string | null
          exam_id: string | null
          id: string
          score_correct: number | null
          score_total: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          duration_seconds?: number | null
          ended_at?: string | null
          exam_id?: string | null
          id?: string
          score_correct?: number | null
          score_total?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          duration_seconds?: number | null
          ended_at?: string | null
          exam_id?: string | null
          id?: string
          score_correct?: number | null
          score_total?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_user_fkey"
            columns: ["exam_id", "user_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "exam_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          created_at: string
          exam_id: string
          position: number
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          position: number
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          position?: number
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_user_fkey"
            columns: ["exam_id", "user_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "exam_questions_question_user_fkey"
            columns: ["question_id", "user_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "exam_questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          time_limit_minutes: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_reviews: {
        Row: {
          flashcard_id: string
          id: string
          rating: string
          resulting_ease: number
          resulting_interval_days: number
          resulting_state: string
          reviewed_at: string
          user_id: string
        }
        Insert: {
          flashcard_id: string
          id?: string
          rating: string
          resulting_ease: number
          resulting_interval_days: number
          resulting_state: string
          reviewed_at?: string
          user_id: string
        }
        Update: {
          flashcard_id?: string
          id?: string
          rating?: string
          resulting_ease?: number
          resulting_interval_days?: number
          resulting_state?: string
          reviewed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_flashcard_user_fkey"
            columns: ["flashcard_id", "user_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "flashcard_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: Json
          created_at: string
          due_at: string | null
          ease: number
          front: Json
          id: string
          interval_days: number
          is_archived: boolean
          lapses: number
          learning_step: number
          lesson_id: string | null
          reps: number
          source_block_id: string | null
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          back: Json
          created_at?: string
          due_at?: string | null
          ease?: number
          front: Json
          id?: string
          interval_days?: number
          is_archived?: boolean
          lapses?: number
          learning_step?: number
          lesson_id?: string | null
          reps?: number
          source_block_id?: string | null
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          back?: Json
          created_at?: string
          due_at?: string | null
          ease?: number
          front?: Json
          id?: string
          interval_days?: number
          is_archived?: boolean
          lapses?: number
          learning_step?: number
          lesson_id?: string | null
          reps?: number
          source_block_id?: string | null
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_lesson_user_fkey"
            columns: ["lesson_id", "user_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "flashcards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_document_versions: {
        Row: {
          content: Json
          created_at: string
          document_id: string
          id: string
          reason: string
          schema_version: number
          user_id: string
          version: number
        }
        Insert: {
          content: Json
          created_at?: string
          document_id: string
          id?: string
          reason: string
          schema_version: number
          user_id: string
          version: number
        }
        Update: {
          content?: Json
          created_at?: string
          document_id?: string
          id?: string
          reason?: string
          schema_version?: number
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_document_versions_document_user_fkey"
            columns: ["document_id", "user_id"]
            isOneToOne: false
            referencedRelation: "lesson_documents"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "lesson_document_versions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_documents: {
        Row: {
          content: Json
          created_at: string
          id: string
          lesson_id: string
          schema_version: number
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          lesson_id: string
          schema_version?: number
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          lesson_id?: string
          schema_version?: number
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_documents_lesson_user_fkey"
            columns: ["lesson_id", "user_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "lesson_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          is_completed: boolean
          module_id: string
          position: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          is_completed?: boolean
          module_id: string
          position: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          is_completed?: boolean
          module_id?: string
          position?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_course_user_fkey"
            columns: ["module_id", "course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id", "course_id", "user_id"]
          },
          {
            foreignKeyName: "lessons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      planned_studies: {
        Row: {
          course_id: string | null
          created_at: string
          estimated_minutes: number | null
          id: string
          scheduled_date: string
          status: string
          study_area_id: string | null
          study_session_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          estimated_minutes?: number | null
          id?: string
          scheduled_date: string
          status?: string
          study_area_id?: string | null
          study_session_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          estimated_minutes?: number | null
          id?: string
          scheduled_date?: string
          status?: string
          study_area_id?: string | null
          study_session_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planned_studies_course_user_fkey"
            columns: ["course_id", "user_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "planned_studies_session_user_fkey"
            columns: ["study_session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "planned_studies_study_area_user_fkey"
            columns: ["study_area_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_areas"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "planned_studies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          onboarding_completed: boolean
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          onboarding_completed?: boolean
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          onboarding_completed?: boolean
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_attempts: {
        Row: {
          attempted_at: string
          exam_attempt_id: string | null
          id: string
          is_correct: boolean
          question_id: string
          selected_option_index: number | null
          self_assessed_correct: boolean | null
          user_id: string
        }
        Insert: {
          attempted_at?: string
          exam_attempt_id?: string | null
          id?: string
          is_correct: boolean
          question_id: string
          selected_option_index?: number | null
          self_assessed_correct?: boolean | null
          user_id: string
        }
        Update: {
          attempted_at?: string
          exam_attempt_id?: string | null
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_option_index?: number | null
          self_assessed_correct?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_attempts_exam_attempt_user_fkey"
            columns: ["exam_attempt_id", "user_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "question_attempts_question_user_fkey"
            columns: ["question_id", "user_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "question_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_option_index: number | null
          created_at: string
          expected_answer: string | null
          id: string
          is_archived: boolean
          lesson_id: string | null
          options: Json
          statement: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          correct_option_index?: number | null
          created_at?: string
          expected_answer?: string | null
          id?: string
          is_archived?: boolean
          lesson_id?: string | null
          options?: Json
          statement: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          correct_option_index?: number | null
          created_at?: string
          expected_answer?: string | null
          id?: string
          is_archived?: boolean
          lesson_id?: string | null
          options?: Json
          statement?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_lesson_user_fkey"
            columns: ["lesson_id", "user_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_areas: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          is_archived: boolean
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_archived?: boolean
          name: string
          position: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_archived?: boolean
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_areas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          created_at: string
          details: Json
          duration_seconds: number | null
          ended_at: string | null
          id: string
          lesson_id: string | null
          method: string
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          lesson_id?: string | null
          method: string
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          lesson_id?: string | null
          method?: string
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_lesson_user_fkey"
            columns: ["lesson_id", "user_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          daily_study_goal_minutes: number
          id: string
          pomodoro_cycles: number
          pomodoro_focus_minutes: number
          pomodoro_long_break_minutes: number
          pomodoro_short_break_minutes: number
          sidebar_collapsed: boolean
          theme: string
          updated_at: string
          user_id: string
          week_starts_on: number
        }
        Insert: {
          created_at?: string
          daily_study_goal_minutes?: number
          id?: string
          pomodoro_cycles?: number
          pomodoro_focus_minutes?: number
          pomodoro_long_break_minutes?: number
          pomodoro_short_break_minutes?: number
          sidebar_collapsed?: boolean
          theme?: string
          updated_at?: string
          user_id: string
          week_starts_on?: number
        }
        Update: {
          created_at?: string
          daily_study_goal_minutes?: number
          id?: string
          pomodoro_cycles?: number
          pomodoro_focus_minutes?: number
          pomodoro_long_break_minutes?: number
          pomodoro_short_break_minutes?: number
          sidebar_collapsed?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
          week_starts_on?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      checkpoint_lesson_document: {
        Args: { p_lesson_id: string }
        Returns: Json
      }
      finish_exam_attempt: {
        Args: { p_exam_attempt_id: string }
        Returns: Json
      }
      jsonb_text_array_within_length: {
        Args: { p_array: Json; p_max_length: number }
        Returns: boolean
      }
      prune_lesson_document_versions: {
        Args: { p_document_id: string }
        Returns: undefined
      }
      reorder_course_modules: {
        Args: { p_course_id: string; p_ids: string[] }
        Returns: undefined
      }
      reorder_courses: {
        Args: { p_ids: string[]; p_study_area_id: string }
        Returns: undefined
      }
      reorder_lessons: {
        Args: { p_ids: string[]; p_module_id: string }
        Returns: undefined
      }
      reorder_study_areas: { Args: { p_ids: string[] }; Returns: undefined }
      restore_lesson_document_version: {
        Args: { p_lesson_id: string; p_version: number }
        Returns: Json
      }
      save_lesson_document: {
        Args: {
          p_content: Json
          p_expected_version: number
          p_lesson_id: string
          p_schema_version: number
        }
        Returns: Json
      }
      submit_flashcard_review: {
        Args: { p_flashcard_id: string; p_rating: string }
        Returns: Json
      }
      submit_question_attempt: {
        Args: {
          p_exam_attempt_id?: string
          p_question_id: string
          p_selected_option_index?: number
          p_self_assessed_correct?: boolean
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
