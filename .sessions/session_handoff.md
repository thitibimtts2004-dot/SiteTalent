# Session Handoff — T-011 (HR req #4)

skill: editor
CFP_COUNT: (unchanged this task)
task: Wire /criticality flagged-skill → /workers pre-filtered to people who have that skill

## Objective
HR requirement #4 — "if a Site lacks a skill, WHO can help." Clicking a skill on /criticality jumps to the finder pre-filtered to everyone (whole org) who can do that skill.

## Outcome
DONE + browser-verified. Reused next/link + the existing WorkerTable skill filter — no new mechanism.

## Changes (3 files, all uncommitted — USER pushes)
- components/WorkerTable.tsx: +prop `initialSkill?: string`; seeds the skill useState from it.
- app/workers/page.tsx: reads `?skill=` from searchParams (handles string|string[]); passes initialSkill.
- components/CriticalityTable.tsx: skill label (col 1) wrapped in next/link <Link href={`/workers?skill=${s.skillId}`}> with a dotted-underline affordance + title tooltip. Imports next/link. Stays a server component.

## Validation
- npx tsc --noEmit: exit 0.
- Browser (dev :3000): /criticality → click "โครงสร้างเหล็ก (เชื่อม)" → /workers?skill=s07, skill select pre-set, พบ 171 คน, "เจอมากสุดที่ (54 คน) · ผรม (37 คน)" hint shows. No scope carried (whole-org search per user decision D1).

## Notes
- Decision D1 (user): finder link drops scope → searches whole org (helper comes from another site).
- No engine/harness change → NO Propagation Stage.
- Edge: a bad ?skill=xyz → empty select → "ไม่พบข้อมูล" (graceful, no crash).

## Next
Roadmap item 2 = UX clarity pass for the 5 pages (HR, desktop). Confirm with user before starting.
