# Session Handoff

skill_name: coder
task: T-015 — home dashboard redesign (Canva-based, /) — DONE + VERIFIED
CFP_COUNT: (unchanged this task)
mece_plan_hash: (S1-S3 all [X])

## What shipped
- lib/dashboard.ts (NEW, pure): ClientWorker + slimWorker + aggregate (locked %skilled/%independent, guards, deterministic Top-10 contractor tie-break).
- lib/dashboard.test.ts (NEW): 26 asserts pass; blind casetest .sessions/casetest_S1.json verdict=confirm 8/8.
- components/Dashboard.tsx (NEW, "use client"): position filter, KPI row, donut, 100%-stacked bars (site 6 + contractor Top 10), scatter (65% line + green/red zones + site/contractor toggle), worker-level searchable drill-down table (Option B).
- app/page.tsx: listWorkers() → slimWorker map → <Dashboard/>; dynamic="force-dynamic" kept.
- package.json: added test:dashboard script.

## Verify-N (all pass)
- npm run test:dashboard exit 0 · npx tsc --noEmit exit 0
- browser / 200, no console/server errors; position filter re-renders every chart (60→17 on ช่างไม้); scatter line/zones/toggle work; drill-down table searchable + reacts to filter/scatter click.

## Key decision (carried)
- Option B: worker code+name DO reach the browser by design (internal-org record lookup) — accepted exception to data.ts "no PII to browser". Per-skill map + assessor/date stay server-side.

## Data note
- Numbers are from the 60-worker DEV fixture. Real 1531-worker numbers: user drops master .xlsx into data/ → `npm run import`. Code is data-shape-driven; no code change needed.

## Not done (out of scope)
- Pre-existing roadmap debt T-008 ([ticket-casetask-incomplete]) — untouched, not part of T-015.
- Other pages (/sites, /workers, /criticality, /trends) unchanged.
