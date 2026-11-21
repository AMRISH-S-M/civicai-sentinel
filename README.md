# CivicAI Sentinel

An evidence-to-resolution civic services prototype for Chennai: citizen photos, explainable risk, municipal triage, field work orders and human-confirmed repair tracking. Covers roads, drainage, water supply and electrical hazards, with English/Tamil intake and key triage terms.

**Local seeded demo, not a deployed municipal service. No trained AI model, live inference, production authentication, shared database or official dispatch is connected.** The distinction from a basic grievance inbox is a traceable photo → assessment → linked incident → crew → before/after → human decision loop. This is a product proposition, not a measured claim of better outcomes.

## Run locally

Prerequisites: Bun 1.x and a modern browser. No API key or backend setup is needed.

```sh
bun install --frozen-lockfile
bun run dev --host 0.0.0.0 --port 8080
# Open http://localhost:8080
bun run test
```

Production bundle: `bun run build`; local production preview: `bun run preview`. Publish using Lovable's Publish action after checking the preview. Publishing does **not** add user accounts, shared storage or real inference. Local preview is not proof of a published deployment.

## Screens

| Page | Purpose |
| --- | --- |
| `/` | Command center, category/status queues, map and quick inspection |
| `/report` | Photo, category, coordinates/preset, description and consent |
| `/incidents/RPT-1001` | Factor breakdown, duplicate review, routing and audit timeline |
| `/field` | Simulated department/crew work orders and completion photos |
| `/track?id=RPT-1005` | Resident progress, repair evidence, confirm/dispute/reopen |
| `/verification?id=RPT-1005` | Before/after, detection overlap, quality checks and sign-off |
| `/analytics` | Demo wards, bands, repeat-aging, preventive ranking and SLA |

## Demo data and privacy

Eleven seeded reports (`RPT-1001`–`RPT-1011`). **Reset demo** restores them and removes reports added to the store; it does not reset the language preference or device ticket shortcuts. Reports and compressed photos live in this browser's localStorage (`civicai-sentinel-v3`), with in-memory fallback if storage is unavailable. They do not synchronize across devices, and clearing browser data deletes them. Use fictional descriptions and avoid faces, plates or personal information. Ticket numbers and selectable actor names are not access control; anyone on this demo device can operate the views.

Uploads accept non-empty JPEG/PNG/WebP up to 10 MB and resize to a maximum side of 1000 pixels. Camera EXIF is not retained. Coordinates are manually entered or browser-provided for intake; follow-up "same location" coordinates and capture times are simulated, not verified camera metadata.

No live API is required for scoring, linking or dispatch. **Cold-start offline is not guaranteed**: sample photos, basemap tiles and web fonts are hosted remotely and need connectivity/cache. Use the fallback script below; no service worker/offline-install claim is made.

## Pitch package

- [Architecture + diagram](docs/architecture.md)
- [Data/model card and limitations](docs/model-card.md)
- [Five-minute demo and fallback](docs/demo-script.md)
- [Judge Q&A](docs/judge-qa.md)
- [Phase 9 test evidence](docs/test-results.md)

## Technical map

TanStack Start / React / TypeScript / Tailwind, Leaflet and Recharts. Pure domain rules are in `src/lib/sentinel/model.ts`; browser state/actions in `store.ts`; generated photo pointers, hand-set demo boxes and upload processing in `images.ts`; bilingual strings in `i18n.ts`. Tests are beside the domain modules and in `src/test`. No app-internal backend endpoints exist, so there are no API endpoint tests to claim.

## Not yet production-ready

Real detector training/evaluation, real incident image similarity, geospatial ward boundaries, registered before/after alignment, secure roles, shared storage, audited dispatch integrations, alerts and notifications, retention/redaction policy, monitoring and a fully offline fallback remain future work. Phase 9–10 package a credible demo, not those production capabilities.
