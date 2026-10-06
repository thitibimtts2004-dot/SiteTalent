task: HR req #4 — /criticality flagged-skill → /workers pre-filtered to who can do it
phase: done
next: Next candidate = roadmap item 2 (UX clarity pass for the 5 pages, HR desktop). Ask user before starting.

## Done 2026-10-06 (T-011)
Wired the finder: clicking any skill on /criticality jumps to /workers pre-filtered to people who have that skill (lvl>=1), searching the WHOLE org (no scope), with the existing "เจอมากสุดที่" hint showing where helpers concentrate. Answers HR requirement #4.
Files: components/WorkerTable.tsx (+initialSkill prop), app/workers/page.tsx (read ?skill=), components/CriticalityTable.tsx (skill label → next/link). tsc clean, browser-verified (s07 → 171 คน + hint). No engine change. UNCOMMITTED — user pushes.

## HR phase scope (confirmed 2026-10-06)
Goal = dashboard that is easy to use AND answers HR's questions. Req #1,2,3,5 DONE · #4 DONE (this task) · #6 OUT (separate Daily-report evaluation system, next phase).
Roadmap order: [DONE] #4 wiring → [NEXT] UX clarity pass (5 pages, HR desktop) → [PHASE 2] #6 evaluation.
