# MECE Plan — HR req #4: skill-shortage → who can help

date: 2026-10-06
task_id: T-011
task: Wire /criticality flagged-skill → /workers pre-filtered to people who have that skill
status: pending user confirm
skill: editor

## Phase 0 — Decisions & Prerequisites
- D1 (user): finder link searches WHOLE org — /workers?skill=<id>, NO scope.
- D2: every skill label clickable (universal "who can do X").
- D3: pass only skill param (lvl left to in-page narrowing → shows all lvl>=1).
- D4: next/link <Link> works in CriticalityTable without "use client" (stays server component).
- Constraints: no src/ (components/app outside code_root) · never build while dev runs · user pushes · no engine edits.

## Phase 1 — Info Gather
status: done → see gather_complete.md ([✓ gather])

## Phase 2 — Plan
### Cycle grouping
- Cycle 1: S1, S2 (the finder must accept the param before the link that sends it is useful) — but independent files, can go together.
- Cycle 2: S3 (the link).
All 3 inline in MAIN (trivial UI edits, 3 small files, judgment on UX) — not delegated.

## Phase 3 — Execution

### S1 — WorkerTable accepts initialSkill
- [X] S1
File: components/WorkerTable.tsx
Model: model_high (MAIN — judgment on client-state seeding)
Behavior: none
BehaviorReason: presentational React component, not code_root; correctness verified by tsc + browser.
Change: add prop `initialSkill?: string`; seed `useState(initialSkill ?? "")` for the skill filter. Keep lvl/site/con/q as-is.
Verify-1: npx tsc --noEmit clean.
Verify-2: browser /workers?skill=s07 → skill select shows "โครงสร้างเหล็ก (เชื่อม)" pre-selected, table filtered.

### S2 — workers page reads ?skill= from URL
- [X] S2
File: app/workers/page.tsx
Model: model_high (MAIN — judgment)
Behavior: none
BehaviorReason: thin server wiring, not code_root; verified by browser + tsc.
Change: read `skill` from awaited searchParams (string | string[] → first value); pass `initialSkill={skill}` to WorkerTable.
Verify-1: npx tsc --noEmit clean.
Verify-2: browser /workers?skill=s11 pre-filters to ระบบไฟฟ้า.

### S3 — CriticalityTable skill label → finder link
- [X] S3
File: components/CriticalityTable.tsx
Model: model_high (MAIN — judgment on UX affordance)
Behavior: none
BehaviorReason: presentational; verified by browser click-through + tsc.
Change: wrap skill label (L122) in next/link <Link href={`/workers?skill=${s.skillId}`}> with a hover/underline affordance so HR sees it is clickable. Import Link.
Verify-1: npx tsc --noEmit clean.
Verify-2: browser /criticality → click a flagged skill (e.g. เชื่อม) → lands on /workers?skill=s07 showing who can do it + "เจอมากสุดที่" hint.

## Close Checklist
- [X] all S[X] · tsc clean (exit 0) · browser click-through verified (/criticality s07 → /workers?skill=s07 = 171 คน + hint) · scope-creep clean (3 declared files) · active_thread phase:done · no engine change → no Propagation Stage.
status: task-complete
