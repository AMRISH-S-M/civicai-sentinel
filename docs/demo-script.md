# Five-minute pitch and demonstration

## Before presenting

Start the app, open each screen once and verify all sample photos appear. On Command Center click **Reset demo** and confirm. Keep English selected; Tamil is one optional click. Use only fictional reports. Open these backup tabs: `/incidents/RPT-1001`, `/incidents/RPT-1003`, `/field`, `/track?id=RPT-1004`, `/verification?id=RPT-1005`, `/analytics`.

Say up front: **"This is a local seeded prototype. Photos and detection annotations are demonstrations; no trained model or official dispatch service is connected."**

| Time | What to show | What to say |
| --- | --- | --- |
| 0:00–0:30 | Command Center: service filters and map | "The gap is not just receiving a complaint; it is proving progress from evidence to a resident-confirmed outcome. We cover roads, drains, water and electrical hazards." |
| 0:30–1:10 | Citizen Report: Water supply → Water pipe leak sample → Greams Rd preset → fictional description → consent → Submit | "Citizens supply evidence and location. This receipt can be tracked on the same device. These boxes are labelled demo predictions, not live AI." |
| 1:10–1:55 | RPT-1001 full record; factor contributions and school exposure. Optional switch exposure to Main road then restore School zone | "Confidence is not urgency. The risk rule is 35/20/20/15/10 and every factor has a reason. Missing exposure means incomplete assessment." |
| 1:55–2:25 | RPT-1003: Accept link to RPT-1001 (or Reject) | "Nearby compatible reports suggest one incident. An admin decides; the original citizen records remain separate." |
| 2:25–3:10 | Field Crew → Roads dept. → RPT-1004 → Add note / Arrived on site → Patched surface sample | "This repair is already in progress. A crew's completion photo requests verification, rather than automatically closing the ticket." |
| 3:10–3:55 | Track Ticket → RPT-1004 → inspect evidence → Yes, it's fixed | "The resident confirms and the ticket closes. The no/still-a-problem action instead reopens it. Dispatch and actor identities are simulated." |
| 3:55–4:30 | Verification Lab RPT-1005: side-by-side, Wipe; replace with Night photo (too dark) | "Unusable evidence is inconclusive. We do not certify repairs from changed lighting or unregistered images; an inspector can require another capture." |
| 4:30–5:00 | Analytics & SLA: ward/band charts and ranked locations | "We bring repeat reports, public exposure and aging into one queue. Targets and ward centers are illustrative. Next: evaluated models and secure municipal integration, not invented accuracy." |

## Extra 30-second failure demonstration

On RPT-1005 in the Lab, uncheck **Comparable viewpoint and subject**, choose Patched surface. Result must be Inconclusive. Recheck before continuing. This is a reviewer assessment; never call it automated angle detection.

## Recovery and fallback

- GPS denied: use a named preset or manually enter coordinates. Do not wait on permission.
- Corrupt/unsupported upload: show the error then select a sample. JPEG/PNG/WebP only, max 10 MB.
- Real detector unavailable: the app is already deliberately demo-only. Do not pretend a model loaded.
- Map tiles unavailable: use the priority queue and full record links; coordinates still identify the illustrative location.
- Hosted photos unavailable: use a local JPEG for upload flows; byte-based annotations remain demo-only. Do not claim fully offline cold-start operation.
- Closed case disappeared from Field Crew: go to Track Ticket by its ID. Reset demo to repeat the entire script.
- Time running short: skip fresh intake; use seeded RPT-1004/RPT-1005, then show analytics.
- Full network/browser failure: present the architecture diagram, model card and this script. A narrated final pitch video/slide deck is not included in this text package; capture one in the actual presentation environment if required.

## Presenter checklist

Do not say "live risk map", "trained model", "verified GPS", "actual municipal SLA", "real assigned crew", "pixel-accurate diff", or quote mAP/accuracy. Do say "demo", "advisory", "human confirmation", "not measured", and "same-device storage".
