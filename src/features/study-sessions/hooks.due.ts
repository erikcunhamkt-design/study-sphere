import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDueReviews(limit = 20) {
  return useQuery({
    queryKey: ["due-reviews", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memory_states")
        .select(`
          *,
          concept:concepts (*)
        `)
        .eq("is_test_data", false)
        .lte("due", new Date().toISOString())
        .order("due", { ascending: true })
        .order("difficulty", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });
}
