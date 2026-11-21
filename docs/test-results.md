# Phase 9 — recorded test evidence

Date: 21 November 2026 (UTC). Tested against the local running preview at `http://localhost:8080`; no production deployment or real AI inference was tested.

## Automated checks

Command:

```sh
bunx vitest run src/lib/sentinel/model.test.ts src/lib/sentinel/failure.test.ts src/lib/sentinel/images.test.ts src/lib/sentinel/store.test.ts src/test/app-routing.test.tsx
```

**Actual result: 5 test files passed; 56 tests passed; 0 failed.**

| Suite | Tests | Coverage |
| --- | ---: | --- |
| model.test.ts | 15 | Severity, incomplete exposure, verification, linking, SLA, ranking, diff, categories, tracker steps |
| failure.test.ts | 28 | Invalid/empty/SVG/oversize uploads; demo fallback; quality/confidence/time/alignment failures; no detections; bands; distinct nearby incidents and rejection |
| images.test.ts | 2 | Corrupt raster decode and unavailable image analysis reject, without fabricated brightness |
| store.test.ts | 4 | Completion waits for human sign-off; dispute reopens; failed photo preserves record; reset restores eleven reports |
| app-routing.test.tsx | 7 | All content routes match, including incident detail |

Tests involving canvas failure use mocked image decoding. Rule confidence, alignment and quality thresholds are prototype policy checks, not validated model metrics.

## Browser checks — observed passing

Playwright Chromium against the actual local app, fresh browser context, fictional inputs:

- GPS denied → explanatory fallback; preset location permits submission.
- Text file and corrupt PNG → visible errors; valid raster upload works afterward.
- Invalid latitude and missing consent keep submission unavailable.
- Water report submitted → receipt → route to Metro Water → crew accepts → starts repair → arrives and adds a note → corrupt completion upload → successful retry.
- Completion link opens the **same ticket** in the Lab.
- Resident confirms → Closed; reload preserves state → resident reopens.
- Lab unsupported upload shows error; wipe slider keyboard movement changes 50 to 51.
- Night sample → Inconclusive; still-damaged sample → Damage Still Visible.
- Reviewer-unchecked comparable viewpoint plus patched sample → Inconclusive.
- Inspector dispute → Reopened; inspector confirmation → Closed.
- Duplicate suggestion rejection, acceptance and unlink actions work.
- Dashboard category/status filters, inspection drawer and close action work.
- English/Tamil toggle and missing-ticket state work.
- Browser page-error events during the end-to-end sweep: **none**.

## Responsive sweep

Seven views (`/`, `/report`, `/analytics`, `/verification`, `/field`, `/track?id=RPT-1005`, `/incidents/RPT-1011`) at **375×812**, **647×529** (the requesting preview size) and **1280×1800**. Final sweep: **21/21 had no document-level horizontal overflow**. Navigation and dense tables scroll within their own bounds. Screenshots were inspected for the electrical detail, analytics, closed resident ticket and dark-image Lab state.

Fixed during the sweep: analytics table/chart min-width overflow; electrical detail work-order/overlay overflow; tall wrapping navigation; read-only counters presented as disabled buttons; completion errors leaving busy state stuck; non-road cases offering road-only repair samples; crew Lab links losing the selected ticket; tracker Find button shrinking its text.

Additional final check: English Find retained a 76-pixel-wide button at 320×812; Tamil intake, tracker and analytics had no page overflow at that width after the tracker progress changed to two rows on small screens. The night comparison photo was confirmed fully loaded with nonzero natural dimensions.

## Verification limits

- A dead-button sweep covers the primary presentation controls listed above, not every possible state/control combination or complete accessibility certification.
- No automatic blur/angle detector, model weights, inference API, API endpoints, live municipal integration, authentication or shared database exists to evaluate.
- Browser GPS success requires a real device/location provider and was not claimed; denied-GPS recovery was tested.
- Hardware camera uploads, mobile Safari, secure role enforcement, storage quota exhaustion and production deployment were not verified.
- No real accuracy, latency, mAP, calibration, field repair-quality or municipal outcome metric is inferred from these tests.
- Remote photo/font/map dependencies mean cold-start offline operation is not guaranteed. Use the documented fallback, not a claim of fully offline readiness.
- The text pitch package is complete; a narrated presentation video and slide deck were not requested in this task and are not included.