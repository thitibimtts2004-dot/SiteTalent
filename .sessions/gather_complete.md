# Gather Complete — T-015 dashboard redesign (Canva-based home page)

task_id: T-015
generated_at: 2026-09-22
skill: coder

[kb-consulted] python3 "<ENG>/scripts/lookup.py" dashboard → only harness-engine telemetry docs (token-telemetry-schema-and-dashboard-spec) matched; NONE relevant to the SiteTalent app UI. Novel topic for the KB → fail-open. App-code precedent read directly from the repo instead: lib/data.ts, lib/types.ts, lib/skills.ts, app/page.tsx.

## Objective
Redesign the home dashboard (`/`, "ภาพรวม") to match the user's signed-off Canva layout: simpler, readable, immediately actionable. Locked decisions (from active_thread.md decisions_locked):
- Headline metric %skilled = (Lv1+Lv2)/(Lv1+Lv2+Zero) over worker×skill CELLS (zeros INCLUDED). Single threshold = 65%. NO exclude-level-0 toggle.
- KEEP: donut (cell distribution 0/1/2) + KPIs (%skilled, %independent = Lv2/(Lv1+Lv2)) + 100%-stacked bars by SITE (6) and by CONTRACTOR (Top 10 by headcount).
- Q3 DROPPED (per-single-skill % impossible). Q5 DROPPED (single round).
- Q4: position (ตำแหน่ง) filter re-renders every chart + a drill-down table under the scatter.
- Q6: scatter X=headcount, Y=%skilled, dashed 65% line, green/red zones, toggle SITE/CONTRACTOR view.

## Findings (from reads)
- Each Worker carries `totals {none,lvl1,lvl2}` = counts of the 17 skills at level 0/1/2 (sum=17), plus `site`, `contractor`, `position`. So EVERY dashboard number can be aggregated from the worker LIST alone — no need for the pre-baked summary docs (overview/bySkill/bySite/byContractor), which carry NO position dimension and therefore cannot support a position filter.
- `listWorkers(filters)` (lib/data.ts:100) already returns `Worker[]` from live Firestore round OR the fixture — so a worker-list aggregation works in BOTH modes with no new accessor.
- data.ts contract: "worker PII is never exposed to the browser." Names/codes are PII. The dashboard needs only {site, contractor, position, l0, l1, l2} per worker → slim to a non-PII shape server-side, then a client component can filter+recompute instantly (matches the mockup approach).
- App stack already has recharts ^2.15 → Donut=PieChart, 100%-stacked=BarChart(stackId+percent), Scatter=ScatterChart + ReferenceLine(65) + ReferenceArea(zones). No new dep.
- Fixture: 60 workers / 6 sites / 8 contractors, positions = [กรรมกร, ช่างประปา, ช่างปูน, ช่างเหล็ก, ช่างไฟฟ้า, ช่างไม้, หัวหน้าชุด]. Real = 1531/6/59 after the master .xlsx is imported (blocker for NUMBERS only, not for building — code is data-shape-driven).
- Existing components (KpiCards, SkillBarChart, RollupTable, WorkerTable, CriticalityTable, TrendTable, Nav) back the OTHER pages (/sites, /workers, /criticality, /trends) → left UNTOUCHED. Only the home page content is replaced.

## Chosen approach
- S1 · lib/dashboard.ts (NEW, PURE) + lib/dashboard.test.ts: `slimWorker(w)→SlimWorker` and `aggregate(slims, position?)→DashboardData` (cells l0/l1/l2, pctSkilled, pctIndependent, headcount, bySite[], byContractor[], positions[]). Group row = {name, headcount, l0, l1, l2, pctSkilled}. Blind case-test asserts the locked formula + position filter on a tiny fixture.
- S2 · components/Dashboard.tsx (NEW, client "use client"): position-filter <select> → recompute via aggregate() → KPI row + Donut + 100%-stacked bars (site: all 6; contractor: Top 10 by headcount) + Scatter (X=headcount, Y=pctSkilled, 65% ReferenceLine, green/red ReferenceArea, SITE/CONTRACTOR toggle) + drill-down table under the scatter (group rows: name, headcount, %skilled, l0/l1/l2 — sortable, non-PII). Styled to the mockup (lv2 #E8722C, lv1 #EEC79A, zero #A9A9A9, accent #6C3BE0).
- S3 · app/page.tsx: `listWorkers()` → `slimWorker` map → `<Dashboard workers={slims} />`. Keep `dynamic="force-dynamic"`. Verify in browser preview.

## Affected files
- lib/dashboard.ts (new) · lib/dashboard.test.ts (new) · package.json (add test:dashboard script) — S1
- components/Dashboard.tsx (new) — S2
- app/page.tsx (replace body) — S3

## Acceptance
- `npm run test:dashboard` (Node) exit 0 (locked formula + position filter).
- `npx tsc --noEmit` exit 0.
- Browser `/` 200: donut+KPIs+2 stacked bars+scatter render; changing the position filter re-renders every chart; scatter 65% line + green/red zones + site/contractor toggle work; drill-down table matches the scatter.

## Out of scope
- Other pages (/sites, /workers, /criticality, /trends) and their components — UNTOUCHED.
- Trend/criticality machinery in lib/data.ts (Q5/Q6-old) — UNTOUCHED (dropped from this view, not deleted).
- Real 1531-worker NUMBERS — need the master .xlsx dropped into data/ + `npm run import` (separate, user-supplied).
- App code (lib/*, components/*, app/*) → NOT engine → NO Propagation Stage.
