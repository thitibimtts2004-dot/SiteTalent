# MECE Plan — SiteTalent Phase 1 Dashboard
date: 2026-09-08
task: Build Phase 1 read-only reporting Dashboard (web app, Next.js + Firestore) from master xlsx
status: confirmed 2026-09-09 — Firestore locked by user
skill: create

## Review resolutions (2026-09-09, skeptical pass)
- Firestore: CONFIRMED by user — keep as Phase-1 display store (persists across phases).
- S2 verify: add triplet->base decode check (a known worker decodes to expected 0/1/2), not just index==header.
- S3 verify: pin exact count = 1531 workers (1532 data rows minus 1 non-numeric ลำดับ); cross-check FULL `ข้อมูลใหม่` (12 rows x 17 skills) vs recomputed-from-base, not one cell.
- S5: apply Thai font to Recharts axis; rotate/wrap the 17 long Thai labels so they don't overlap.

## Phase 0 — Decisions & Prerequisites
- Stack: Next.js (App Router, TS) + Tailwind + Recharts + Firebase Firestore.
- Data: import xlsx `ประเมินรายบุคคล` (1535 rows) → Firestore `workers/*` + precomputed `summary/*` aggregate docs. Read-only dashboard. Cross-check totals vs sheet `ข้อมูลใหม่`.
- USER prerequisite (blocks live data, NOT the build): create Firebase project → enable Firestore → create Web App (web config) → generate service-account key (admin, for import). Put web config in `.env.local`, service-account JSON path in `.env` (both gitignored).
- Firestore data model:
  - `workers/{code}`: { code, name, site, contractor, position, assessedDate, assessor, skills: {skillId: 0|1|2}, totals:{none,lvl1,lvl2,total,score} }
  - `summary/overview`: totals (workers, sites, contractors, overall lvl2 %).
  - `summary/bySkill`: 17 skills → {none, lvl1, lvl2} counts.
  - `summary/bySite`, `summary/byContractor`: rollups.
  - (Small summary docs keep dashboard reads cheap; raw `workers` only queried for the table.)

## Cycle grouping
- Cycle 1 (foundation, serial): S1 → S2 → S3
- Cycle 2 (UI, after data layer): S4 → S5 → S6 → S7
- Cycle 3: S8

## Phase 3 — Sections

- [X] S1 · Scaffold + Firebase wiring  (verified 2026-09-09: build ok · secrets gitignored)
  File: package.json, next.config, tailwind, app/, lib/firebase.ts, .env.example, .gitignore
  Model: model_medium
  Do: create-next-app (TS+Tailwind+App Router); add recharts, firebase, firebase-admin, xlsx; lib/firebase client init (reads NEXT_PUBLIC_* env) + lib/firebaseAdmin server init; .env.example + .gitignore for secrets + data/normalized.json.
  Verify-N: (1) `npm run build` passes; (2) dev server boots; (3) secrets gitignored.

- [X] S2 · Domain types + skill metadata + column map  (verified 2026-09-09: 17 skills, order 1-17, base cols step 3)
  File: lib/types.ts, lib/skills.ts, lib/xlsxMap.ts
  Model: model_low
  Do: Worker/SkillLevel/Rollup types; 17-skill list (id,label,order); exact xlsx column indices (meta 0-7, skill triplets, totals) derived from verified layout.
  Verify-N: (1) 17 skills, correct order; (2) column indices match sheet header row 2.

- [X] S3 · Import pipeline (xlsx → normalized → Firestore + dev fixture)  (verified 2026-09-09: 1531 · decode ok · 6 sites reconcile · anchor 239/53/89)
  File: scripts/import.ts (or .mjs), package.json script
  Model: model_medium
  Do: parse `ประเมินรายบุคคล` from row 3; normalize each worker; compute per-skill level (0/1/2) from triplet flags; build summary aggregates; write `data/normalized.json` (dev fixture, always) + upsert Firestore (when creds present); print validation report vs `ข้อมูลใหม่`.
  Verify-N: (1) row count ~1532; (2) a site's per-skill lvl2 count matches `ข้อมูลใหม่` (e.g. Escent Hatyai 2 งานปูน lvl2=89); (3) normalized.json emitted.

- [X] S4 · Data access layer  (verified 2026-09-09: selectors typed, fixture fallback works)
  File: lib/data.ts
  Model: model_medium
  Do: read `summary/*` + query `workers` from Firestore; fallback to `data/normalized.json` when Firestore not configured (dev preview). Typed selectors: getOverview, getBySkill, getBySite, getByContractor, listWorkers(filters).
  Verify-N: (1) selectors typed; (2) fixture fallback works with dev server.

- [X] S5 · Overview page (headline)  (verified 2026-09-09: 17 bars render, Thai labels legible, numbers match)
  File: app/page.tsx, components/KpiCards.tsx, components/SkillBarChart.tsx
  Model: model_medium
  Do: KPI cards (workers, sites, contractors, overall lvl2 %); Recharts bar = ระดับ2 count/% per 17 skills (the headline metric).
  Verify-N: (1) renders with fixture data; (2) 17 bars; (3) numbers match summary.

- [X] S6 · Site & Contractor view  (verified 2026-09-09: 6 sites/59 contractors, totals tie to 1531)
  File: app/sites/page.tsx, components/RollupTable.tsx
  Model: model_medium
  Do: per-site + per-contractor rollup table/chart from summary; site filter.
  Verify-N: (1) rows = sites/contractors; (2) totals tie to overview.

- [X] S7 · Worker table  (verified 2026-09-09: filter Live Ramintra->95, per-skill levels color-coded)
  File: app/workers/page.tsx, components/WorkerTable.tsx
  Model: model_medium
  Do: searchable/filterable/paginated list; columns = code, name, site, contractor, per-skill level, total; filter by site/contractor/skill.
  Verify-N: (1) search+filter work; (2) per-skill level shows correctly.

- [X] S8 · Layout, nav, Thai font, README  (verified 2026-09-09: nav active states, Thai renders, README has Firebase steps)
  File: app/layout.tsx, components/Nav.tsx, README.md
  Model: model_medium
  Do: header/nav across pages; Thai-capable font; responsive; README = run steps + Firebase setup checklist for the user.
  Verify-N: (1) nav links all pages; (2) Thai renders; (3) README has Firebase steps.

## Phase 3 Close Checklist
- All sections [X]; `npm run build` clean; README complete; secrets gitignored; active_thread phase:done.
- Live-data verification (import into real Firestore) waits on user Firebase creds — flagged, not blocking the build.
