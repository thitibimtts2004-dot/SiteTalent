# MECE Plan — T-008 Global scope filter (site + contractor) across all views
date: 2026-09-24
task_id: T-008
task: T-008 global scope filter (site + contractor) across all views
status: confirmed 2026-09-24 — user accepted the 4 recommended design decisions ("ตามที่เเนะนำ") and said proceed ("ดำเนินการต่อ")
skill: agent

## Phase 0 — Decisions & Prerequisites
- D1: No global FilterBar on "/" — the T-018 Dashboard bar already owns ?site=&contractor= there (same keys).
- D2: Nav links carry the current ?site=&contractor= so scope survives page switches.
- D3: /sites recomputes rollups from the scoped worker set (not a row filter).
- D4: /trends filters rows only (no recompute of round history).
- Unscoped path must stay on precomputed summary docs (no extra Firestore reads).
- Worker PII stays server-side; FilterBar receives only site/contractor name lists.
- Constraints: never `npm run import`/build while dev runs · user pushes · no harness engine edits.
- Dropped: optional import.ts reuse of rollupWorkers (scripts/** owned by harness_editor → ownership mismatch); the S1 parity test guards formula drift instead.

## Phase 1–3 — cleared
status: task-complete
