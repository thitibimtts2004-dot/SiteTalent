# MECE Plan — T-015 dashboard redesign (Canva-based home page `/`)

Task: replace the home dashboard with the signed-off Canva layout (donut + KPIs + 100%-stacked
bars by site & contractor + scatter with 65% line + position filter + drill-down), computed from
the worker list so a position filter can re-render every chart. Locked metric = (Lv1+Lv2)/(Lv1+Lv2+Zero).

## Phase 0 — Boot (once per session · keep [X] on resume · reset on topic switch only)
- [X] B1: boot_init ran (compact hook) · CHAT_TOTAL reset
- [X] B2-B3: skill=coder · mece loaded
- [X] C0-C3: post-compact continue · task=dashboard redesign (active_thread in_progress) · Phase 1 fresh

## Phase 1 — Info Gather
- [X] G0: task clear — layout + metric pre-locked via signed-off interactive mockup (active_thread decisions_locked). One open fork surfaced to user at M5 (drill-down = group rows vs worker names).
- [X] G1/G2: lookup.py dashboard (novel → fail-open) + read lib/data.ts, lib/types.ts, lib/skills.ts, app/page.tsx + inspect fixture
- [X] G3: affected files + Verify-N drafted · [✓ gather]
- [X] gather_complete.md written today with [kb-consulted]

## Phase 2 — Plan
- [X] M1.5: S1 (pure data) → S2 (client UI, consumes S1) → S3 (server wiring, consumes both). SEQUENTIAL. No irreversible action. Risk surface: S2 (largest — recharts UI).
- [X] M2: 3 sections
- [X] M3: written from template · plan_lint to run
- [ ] M4: skeptical_reviewer (auto) → .skeptical_ok → [sr-done]
- [ ] M5: present plan to user → wait explicit confirm (drill-down fork)
- [X] M6: roadmap T-015 §6.2 registered
- [ ] M7: [✓ MECE]

## Phase 3 — Execute

### Cycle grouping
- Cycle 1: S1 (serial)
- Cycle 2: S2 (serial · needs S1 types)
- Cycle 3: S3 (serial · needs S1+S2)

### Per-Section Invariants (apply to EVERY S<N>)
- [pre-read] before every Read · [model] tier at section start · [✓ written] after write · Verify-N pass before [X]
- code_root section → codecheck (Gate 5) + behavioural case-test where declared

### S1 · T-015 · Pure data layer — lib/dashboard.ts + test        [Cycle 1 · serial]
Model: model_high (main context — the locked metric formula is judgment; correctness-critical pure core)
File: lib/dashboard.ts · lib/dashboard.test.ts · package.json
Behavior: assert
What: ClientWorker {code,name,site,contractor,position,l0,l1,l2} (name/code kept — user chose drill-down
  Option B: worker-level searchable table for internal use); slimWorker(Worker)→ClientWorker;
  aggregate(workers, position?)→{cells{l0,l1,l2}, pctSkilled=(l1+l2)/(l0+l1+l2), pctIndependent=l2/(l1+l2),
  headcount, bySite[], byContractor[], positions[]}; group row {name,headcount,l0,l1,l2,pctSkilled}.
  GUARDS: pctSkilled=0 when total=0; pctIndependent=0 when l1+l2=0. Top-10 contractor sort deterministic (headcount desc, then name asc).
  Add "test:dashboard" npm script. Blind case-test asserts locked %skilled, %independent, position filter, and the divide-by-zero guards.
Verify-N:
1. npm run test:dashboard exit 0
2. npx tsc --noEmit exit 0
3. aggregate on the tiny fixture returns the hand-computed pctSkilled/pctIndependent
- [X] S1

### S2 · T-015 · Client dashboard UI — components/Dashboard.tsx        [Cycle 2 · serial]
Model: model_high (main context — presentational judgment + must be a client component, must match mockup)
File: components/Dashboard.tsx
Behavior: none
BehaviorReason: pure presentational recharts wiring over S1's tested aggregate(); no new logic to assert
  (the metric math is S1's; correctness of rendering is covered by Gate 5 codecheck + browser Verify-N).
What: "use client"; props = ClientWorker[]. State = position filter + scatter view(site|contractor) + text search + optional group select.
  Render: position <select>; KPI row (%skilled, %independent, headcount, sites/contractors);
  Donut (cells 0/1/2); 100%-stacked bar by site (6) + by contractor (Top 10 headcount);
  Scatter X=headcount Y=pctSkilled + ReferenceLine y=65 (dashed) + green/red ReferenceArea zones + site/contractor toggle;
  DRILL-DOWN = worker-level searchable table under scatter (Option B): columns code, name, ตำแหน่ง, ไซต์, ผรม., ระดับ0/1/2 counts;
  search box (name/code), reacts to the position filter, and to a clicked scatter dot (filters to that site/contractor group). Colors: lv2 #E8722C, lv1 #EEC79A, zero #A9A9A9, accent #6C3BE0.
Verify-N:
1. npx tsc --noEmit exit 0
2. browser: changing the position filter re-renders donut+KPI+bars+scatter+table
3. scatter shows the 65% line, zones, and site/contractor toggle switches the dot set
- [X] S2

### S3 · T-015 · Server wiring — app/page.tsx        [Cycle 3 · serial]
Model: model_high (main context — server/client boundary + PII slim is a correctness gate)
File: app/page.tsx
Behavior: none
BehaviorReason: thin wiring — listWorkers()→slimWorker map→<Dashboard/>; correctness = browser 200 (Verify-N).
What: home page: listWorkers() → slimWorker() map (drops the per-skill map + assessor/date; KEEPS code/name
  intentionally — user chose Option B, worker-level table for internal use) → <Dashboard workers={clientWorkers}/>.
  Keep dynamic="force-dynamic". Header text updated to the new dashboard.
Verify-N:
1. npx tsc --noEmit exit 0
2. browser / returns 200 and renders the full dashboard
3. client payload carries only ClientWorker fields (per-skill map + assessor/date dropped)
- [X] S3

### Surgical Scope
Declared File: lib/dashboard.ts, lib/dashboard.test.ts, package.json, components/Dashboard.tsx, app/page.tsx.
Any other changed file → [scope-creep].

## Phase 3 — Close Checklist
- [ ] R8 index sync (mutation_sync auto + [r8-sync-check])
- [ ] Roadmap [X] T-015
- [ ] [scope-creep] gate vs .scope_baseline
- [ ] Verify-N PASS (tsc + test:dashboard + browser preview)
- [ ] scrutinize (full) at close
- [ ] Ask user "มีอะไรอยากแก้ไขหรือปรับเพิ่มไหมครับ?"
- [ ] [session-health]
- [ ] NO Propagation (app code)
- [ ] session_handoff.md
- [ ] PATH A: active_thread phase:done FIRST → then clear_plan.py
