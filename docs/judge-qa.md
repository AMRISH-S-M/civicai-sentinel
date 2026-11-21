# Judge Q&A — honest answers

**How is this different from existing grievance platforms?**
The prototype connects intake, explainable prioritization, duplicate review, crew evidence and resident confirmation into one inspectable loop. We have not benchmarked it against a specific platform or measured municipal impact.

**Is the AI real? What accuracy did you achieve?**
No trained detector is connected. Generated sample photos use hand-entered annotations; uploads use a deterministic demo generator. Accuracy, precision/recall and mAP are not measured. Tests validate code rules, not inference quality.

**What data would you train on?**
RDD2022 India is the proposed road starting point. We have not downloaded it or trained on it. Its exact release terms need review. Drainage, water and electrical categories need separate permissioned data and evaluations.

**Why those severity weights?**
They are the blueprint's explicit prototype policy: damage 35%, size/exposure 20% each, recurrence 15%, deterioration 10%. Factor explanations allow review. They are not empirically validated engineering weights.

**What happens if data is missing?**
Unknown exposure returns incomplete assessment. No prior comparable inspection is explicitly neutralized, not invented. GPS failure permits manual/preset location. Missing follow-up GPS is only a warning; poor brightness, uncertain detections or a declared viewpoint mismatch give inconclusive.

**Does a clean-looking after photo automatically close a ticket?**
No. The suggestion is Appears Improved, Damage Still Visible or Inconclusive. A resident or inspector confirms/disputes. The crew's separate "no defect found" inspection close is also an explicit human action.

**Can you really verify location and capture time?**
Not in this demo. Follow-up coordinates are simulated when same location is selected; time is upload time, not authenticated camera EXIF. Neither is proof. Secure geotagging and evidence authenticity remain future work.

**Can the app tell whether a fallen wire is live?**
No. A photograph cannot prove energization. The electrical category is an illustrative routing aid, not an electrical safety assessment. People must not touch fallen wires or use this demo instead of emergency services.

**How do duplicates avoid deleting someone's complaint?**
Compatible class plus location/time rules generate suggestions. Admins accept/reject; each record and timeline remains separate. This is not automatic merging or image-similarity inference.

**Are these real ward boundaries or service commitments?**
No. Ward assignment is nearest demo center; SLA values are illustrative 2/7/14/30-day targets. Real boundaries, policy and municipal agreements are not integrated.

**What about privacy and access control?**
This is a same-device demo with browser storage. No login, role security, evidence redaction or secure shared storage exists. Use fictional data. Production needs authenticated roles, scoped data access, private image storage, consent/retention policy and auditable human actions.

**Does it work offline?**
Domain logic needs no API key or inference server, but hosted photos, fonts and map tiles need network/cache. A cold-start offline app is not implemented. The pitch script includes a text/queue/local-upload fallback.

**What was tested?**
See the actual recorded automated and browser evidence in `test-results.md`: invalid uploads, unavailable image analysis, low confidence, dark/overexposed and mismatched comparisons, distinct nearby incidents, sign-off/reopen, reset and route/layout checks. A passing test is not model validation or a complete accessibility certification.

**What is next and what would it cost?**
Train/evaluate category-specific detectors, establish secure shared persistence/roles, obtain municipal routing agreements, validate field evidence and conduct a pilot. No GPU budget, service pricing or claimed savings has been measured; estimates require a concrete deployment/training plan.
