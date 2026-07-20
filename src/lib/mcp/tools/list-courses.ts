import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_courses",
  title: "Listar cursos",
  description:
    "Lista os cursos ativos do usuário autenticado. Se `study_area_id` for informado, filtra por essa área.",
  inputSchema: {
    study_area_id: z
      .string()
      .uuid()
      .optional()
      .describe("Opcional. ID da área de estudo para filtrar."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ study_area_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    let query = supabase
      .from("courses")
      .select("id, name, description, study_area_id, position")
      .eq("is_archived", false)
      .order("position", { ascending: true });
    if (study_area_id) query = query.eq("study_area_id", study_area_id);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { courses: data ?? [] },
    };
  },
});
