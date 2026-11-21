# CivicAI Sentinel — demo data/model card

## Identity and intended use

Version: `demo-prediction v0 (no live inference)`. Intended for a hackathon workflow demonstration, not engineering inspection, emergency response, repair certification, legal proof or automated allocation of public funds. Every assessment is advisory; humans decide.

**No detector has been trained, loaded or evaluated in this app.** There are no real accuracy, precision, recall, mAP, calibration or field outcome metrics. Automated rule tests measure software behavior, not model quality.

## Data and predictions

- Eleven fictional civic reports at illustrative Chennai coordinates. Ward assignment uses the nearest of five demo ward centers, not actual ward polygons.
- Sample photos are AI-generated illustrative imagery delivered through Lovable asset pointers, not field evidence or dataset samples. Boxes and confidence values on these photos are hand-entered demonstration annotations.
- Uploads use a deterministic byte-hash/category-based box generator. It does **not inspect scene content**; it can put defects on a clean photo and can suggest improvement for an unchanged photo. Numeric confidence is illustrative, not a measured probability.
- Road classes: D00 longitudinal crack, D10 transverse crack, D20 alligator crack, D40 pothole. Additional demo-only classes: DR1/DR2 drainage, WP1/WP2 water, EL1/EL2/EL3 electrical. A wire cannot be identified as electrically live from these photos.
- Road repair samples exist; non-road repairs require a user-uploaded follow-up. Road repair samples are not evidence for another service category.

## Prospective dataset, attribution and license

The blueprint proposes **RDD2022 (Road Damage Dataset 2022), India subset**, for future road-detector training. Reference: Arya et al., *RDD2022: A multi-national image dataset for automatic Road Damage Detection*, and the official [RDD2022 repository](https://github.com/sekilab/RoadDamageDetector/tree/master/RDD2022). This project contains no downloaded RDD2022 data, weights or training run.

The dataset's applicable release license, attribution requirements and redistribution/commercial-use permissions must be read and recorded from the exact release before use; no license permission is asserted here. RDD2022 road labels do not establish drainage, water or electrical detection capability. Those categories need separately sourced, permissioned and evaluated data. Generated sample imagery is not a validation set.

## Explainable rule-based severity

`round(0.35 Damage + 0.20 Size + 0.20 Exposure + 0.15 Recurrence + 0.10 Deterioration)`.

- Damage: highest class score (D00 40, D10 50, D20 70, D40 90; DR1 70, DR2 75, WP1 60, WP2 55, EL1 80, EL2 70, EL3 98).
- Size: summed normalized box areas, capped at 1; multiplied by 200 then capped at 100. Overlapping boxes can double-count area. Not physical dimensions.
- Exposure: admin context, residential 30, main road 65, school 90, hospital 100; unknown → **incomplete assessment**, no fabricated final score.
- Recurrence: linked reports within 30 days, `(count−1) × 35`, capped at 100. A recurrence proxy, not proof of repeated repair failure.
- Deterioration: no comparable prior observation → explicit neutral 0; otherwise `50 + 500 × area delta`, clamped 0–100.
- Bands: 0–29 Low, 30–54 Moderate, 55–74 High, 75–100 Critical.

SLA demo targets: Critical 2 days, High 7, Moderate 14, Low 30; incomplete uses a 7-day placeholder. These are not municipal standards. Preventive priority uses 40% max risk, 30% deterioration, 20% exposure, 10% recurrence, not a trained forecast.

## Duplicate review

75 m radius; same/compatible detection class required; weighted location/category/time score with a 0.60 suggestion threshold. Image similarity is not used. Admin accepts/rejects; citizen records stay separate. Suggestions are not identity proof.

## Repair comparison

Possible outcomes: **Appears Improved / Damage Still Visible / Inconclusive**. Brightness <45 or >235, unavailable brightness, invalid/non-increasing capture time, >50 m follow-up displacement, confidence <0.45, no original detections, or reviewer-declared incomparable viewpoint cause inconclusive. These are prototype thresholds, not validation-derived tolerances.

Missing follow-up GPS is a warning, not automatic failure. Follow-up timestamp is upload time; "same location" is synthesized from the original coordinates. Image registration and automatic blur/angle detection are not implemented. Reviewer marks mismatched viewpoint in the Lab. Box overlap diffing is visual only, with IoU ≥0.2; it does not perform class-aware pixel registration. Area <25% of original or no after detections suggests improvement; ≥60% suggests remaining damage; intermediate reduction is inconclusive. **Only explicit human sign-off closes a repair-verification ticket.** A crew can separately close an inspection as "no defect found"; that is a human inspection action, not AI certification.

## Risks and next evaluation

Viewpoint, lighting, cropping, water, occlusion and device differences can invalidate comparison. No face/license-plate redaction, identity proof, adversarial evidence checks, secure role restriction or cross-device persistence is present. Do not use for an electrical emergency; do not touch fallen wires.

Before real inference: document exact dataset release/license; split by scene/location to prevent leakage; record weights, training configuration and hardware; evaluate per-class precision/recall/mAP and false-negative cases on held-out India data; evaluate each added service category separately; test calibration, brightness/viewpoint robustness and human override; publish actual measured results and failure examples. Until then all performance metrics remain **not measured**.
