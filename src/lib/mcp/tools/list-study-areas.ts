import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "list_study_areas",
  title: "Listar áreas de estudo",
  description:
    "Lista as áreas de estudo ativas (não arquivadas) do usuário autenticado, na ordem definida.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
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
    const { data, error } = await supabase
      .from("study_areas")
      .select("id, name, description, position")
      .eq("is_archived", false)
      .order("position", { ascending: true });
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { areas: data ?? [] },
    };
  },
});
