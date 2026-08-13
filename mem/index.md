# Project Memory

## Core
- Premium visual identity: Graphite/Black background, Magenta (#d9006e) highlights, oklch tokens.
- TanStack Start (React 19, Vite 7) + Supabase (Lovable Cloud).
- Session in localStorage, `ssr: false` for auth-dependent routes.
- RLS enabled on all tables, `service_role` never in client.
- Timezone-aware: all date logic uses `profile.timezone` via `startOfDayIso`.
- No IA in core study features (see DECISAO_IA.md).

## Memories
- [Phase 06 Plan](mem://features/phase-06-plan) — Study schedule, calendar, and planned revisions.
- [Dominus Intelligence](mem://reference/dominus-intelligence) — Strategic vision and cognitive principles.
- [Dominus Navigation](mem://reference/dominus-navigation) — Sidebar architecture and navigation flow.
