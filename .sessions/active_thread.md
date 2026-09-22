task: SiteTalent dashboard redesign (Canva-based, simplified, action-first) — T-015
phase: done
next: T-015 CLOSED — home dashboard redesign shipped + verified + user-approved. Files: lib/dashboard.ts (+test), components/Dashboard.tsx, app/page.tsx, package.json (test:dashboard). Roadmap [X] T-015 done 2026-09-22. Full scrutinize pass=go. session_handoff.md written. NO Propagation (app code). Pre-existing engine drift left for harness-setup task: 3 deleted knowledge/ files (harness_authoring_techniques, harness_flow_20260525, loop_engineer_spec) still referenced by the constitution. Next natural step (separate task): user drops master .xlsx -> npm run import for real 1531-worker numbers.

decision_drilldown_LOCKED (user this turn): Option B — the drill-down under the scatter is a WORKER-LEVEL searchable table (internal-org use). Sending worker name/code to the browser is ACCEPTED by the user for this internal tool (intentional exception to data.ts "no PII to browser"). ClientWorker shape = {code, name, site, contractor, position, l0, l1, l2}. Both the aggregations AND the table consume this one array. Table = searchable by name/code, filterable, reacts to the position filter + scatter group selection.
skeptical_constraints_to_apply in S1: guard divide-by-zero (pctIndependent when l1+l2=0, pctSkilled when total=0 → return 0); drill-down/table + scatter share the SAME aggregate arrays (single-source, no drift); Top-10 contractor sort has a deterministic tie-break (headcount desc, then name).

decisions_locked:
  - Base = user's Canva 4-chart layout. Priority: cut complexity, easy to read, immediately actionable.
  - Headline metric LOCKED: %skilled = (Lv1+Lv2) / (Lv1+Lv2+Zero) over worker x skill CELLS (zeros INCLUDED in denominator). Single threshold = 65%. NO exclude-level-0 toggle (drop it — cut complexity). This is the "density / coverage" reading and matches the Canva donut.
  - Q1/Q2 KEEP: donut (cell distribution 0/1/2) + KPIs (%skilled, %independent=Lv2/(Lv1+Lv2)) + 100%-stacked bars by SITE (6) and by CONTRACTOR (Top 10 by headcount).
  - Q3 DROPPED: per-single-skill % impossible — level-0 = "worker not recorded on that skill", cannot attribute the zero to a skill group, so per-skill denominator is unreliable. (Aggregate is fine because its denominator = workers x 17, known.)
  - Q4 KEEP: position (ตำแหน่ง) filter re-renders every chart; ADD a drill-down worker table under the scatter, synthesized from the data we have.
  - Q5 DROPPED: only one assessment round exists; no re-assessment plan yet -> no trend.
  - Q6 KEEP: scatter X=headcount, Y=%skilled, dashed 65% line, green(pass)/red(fail) zones; toggle SITE view / CONTRACTOR view (contractor view shows all ~59 as dots).

data_status:
  - REAL data = 1531 workers / 6 sites / 59 contractors, but the master .xlsx is NOT in the repo. data/normalized.json (60 workers / 6 sites / 8 contractors) is a synthetic DEV FIXTURE.
  - BLOCKER for real NUMBERS (not for building): user must drop the master .xlsx into data/ -> run `npm run import` -> normalized.json becomes real. Code is data-shape-driven so it works against fixture now, real after import.
  - Canva numbers (5400 / 16.7 / 50 / 33.3) were placeholders — ignore.

mockup:
  - Interactive prototype delivered to user: scratchpad/mockup.html (generator scratchpad/gen_mockup.py). Default view = the LOCKED metric. Reflects all decisions above.

impl_targets (when building):
  - lib/data.ts (group aggregation: per-group cell L0/L1/L2, %skilled density, headcount; position filter; contractor top-10; scatter series site/contractor)
  - components/: new/updated chart components (donut, KPI row, 100%-stacked bar, scatter with 65% line + view toggle, position filter control, Q4 drill-down worker table)
  - app/page.tsx wiring
  - Confirm terminology: "โครงการ/project" in Canva == site (6). Contractor == ผู้รับเหมา (59).

done_prior:
  - harness v1.62.4 setup COMPLETE (separate closed task).
