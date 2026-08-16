import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type ThemeChoice = "system" | "light" | "dark";

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: ThemeChoice;
  sidebar_collapsed: boolean;
  daily_study_goal_minutes: number;
  week_starts_on: number;
  pomodoro_focus_minutes: number;
  pomodoro_short_break_minutes: number;
  pomodoro_long_break_minutes: number;
  pomodoro_cycles: number;
}

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  timezone: string;
  onboarding_completed: boolean;
  onboarding_state: string | null;
  onboarding_started_at: string | null;
  first_cycle_completed_at: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, timezone, onboarding_completed, onboarding_state, onboarding_started_at, first_cycle_completed_at")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Profile, "full_name" | "avatar_url" | "timezone">>) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", user?.id] }),
  });
}

export function usePreferences() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["preferences", user?.id],
    queryFn: async (): Promise<UserPreferences | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as UserPreferences | null;
    },
  });
}

export function useUpdatePreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<UserPreferences, "id" | "user_id">>) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("user_preferences")
        .update(patch)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["preferences", user?.id] }),
  });
}
