import { auth, defineMcp } from "@lovable.dev/mcp-js";

import whoamiTool from "./tools/whoami";
import listStudyAreasTool from "./tools/list-study-areas";
import listCoursesTool from "./tools/list-courses";

// The OAuth issuer MUST be the direct Supabase host (RFC 8414 issuer match).
// Read from the VITE_ literal which Vite inlines at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "studyos-mcp",
  title: "StudyOS",
  version: "0.1.0",
  instructions:
    "Ferramentas do StudyOS. Cada chamada age como o usuário autenticado (RLS aplicada). Use `whoami` para checar a conexão, `list_study_areas` para listar áreas de estudo ativas e `list_courses` para listar cursos (opcionalmente filtrando por área).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listStudyAreasTool, listCoursesTool],
});
