<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- CivicAI Sentinel runs in local seeded demo mode: data lives in localStorage via src/lib/sentinel/store.ts and AI detections are labelled demo predictions — the blueprint requires a demo that never depends on live APIs and never fakes live inference.
- Scoring, duplicate-linking and before/after verification rules live only in src/lib/sentinel/model.ts with tests beside it, so every UI shows the same explainable numbers.
- UI copy for citizen intake and triage terms goes through src/lib/sentinel/i18n.ts (English/Tamil) so both languages stay in sync.
- Demo sample photos (all categories) are Lovable asset pointers in src/assets/roads with hand-placed demo boxes in images.ts; keep boxes matched to the photo when swapping images.
- Issue categories and their detection classes, damage scores and departments are defined only in model.ts (CLASS_CATEGORY, DEPARTMENTS); add new categories there first.
- Citizen tracker (/track) and field dispatch (/field) reuse store.ts signOff/submitAfterPhoto; crews per category live in model.ts CREWS so dispatch and tracking show the same assignment.
- Validate all citizen and completion photo uploads through images.ts and always release busy state on failure; shared handling prevents workflow-specific bypasses.
- Keep pitch and evaluation documentation under docs/ and link it from README; disclose demo heuristics separately from unmeasured model performance.

## Project rules

- Reports live in the Supabase `public.reports` table (one row per citizen record, JSON columns for detections/history/verification); `src/lib/sentinel/store.ts` keeps the synchronous store API, pushes changed rows, and refetches on realtime changes, so screens never talk to the database directly.
- localStorage is only an offline cache and the test-mode backend; remote sync is disabled when `import.meta.env.MODE === "test"` so unit tests stay deterministic.
- Database access is open to anonymous visitors until staff sign-in exists; tighten the RLS policies before any real deployment.
- Photos are stored inline in the report row because the workspace blocks public storage buckets.
