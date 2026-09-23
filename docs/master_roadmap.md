# Master Roadmap

> Status: `[ ]` pending -> `[/]` in progress -> `[X]` done

---

## T-000: Project initialized
- [X] T-000 · P2 · project scaffolded by project_init.py

## T-001: Phase 1 Dashboard build
- [X] T-001 · P1 · done 2026-09-09 · SiteTalent Phase 1 read-only dashboard (Next.js + Firestore) — 8 sections, build clean, data verified (1531 workers)

## T-006: Round-aware import pipeline (foundation for trends)
- [X] T-006 · P0 · done 2026-09-18 · attempts:1 · tool_calls:~35 · depends_on: — · VERIFIED: scripts/import.ts already implements the full round contract (rounds/{id} status:current + workers + 4 summary docs · archives previous currentRoundId with merge · sets config/app.currentRoundId). Proven by scripts/import.round.test.ts (real upsertFirestore via DI + in-memory fake Firestore, cases C1-C4) — test exit 0, tsc clean, independent fresh-context codecheck CONFIRM (S1+S2). No feature code needed; added export+db DI param + entry guard for testability. NOTE: live 2-round Firestore run (How-Check) is R15 db-gated (needs creds + user "yes") — separate step; unit proof stands.
  Title: Import writes each assessment period as its own round; sets currentRoundId
  ContextTask: The Round schema already exists (lib/types.ts Round/RoundStatus) and lib/data.ts reads rounds/{id}/summary + config/app.currentRoundId, but the import path may still write a single flat snapshot. Trend questions (user Q5, Q6 → T-004/T-005) are impossible without ≥2 rounds of data. This ticket makes every import produce a distinct round. VERIFY current scripts/import.ts round behavior before implementing.
  Goal: Each import creates a new rounds/{roundId} (workers + summary/*), archives the previous round (status:archived), and points config/app.currentRoundId at the newest round.
  How-Check: Run: import two periods in sequence. Expect: two docs under rounds/, currentRoundId equals the latest, dashboard shows latest, older round still readable.
  Independent-of: T-003 (shares lib/data.ts but edits the import-write path, not the worker filter), T-007 (shares lib/types.ts, additive only). T-004/T-005 depend on this.
  Relate File: scripts/import.ts, lib/data.ts, lib/types.ts

## T-002: Skill chart shows level-1 alongside level-2 (answers Q3)
- [X] T-002 · P1 · done 2026-09-17 · attempts:1 · tool_calls:~30 · depends_on: — · SkillBarChart now stacks lvl1(amber)+lvl2(green) per skill with legend + 2-line tooltip; app/page.tsx maps both. Browser-verified + independent codecheck confirm.
  Title: Home skill chart displays level-1 (needs supervision) beside level-2 (independent) per skill
  ContextTask: app/page.tsx currently maps only bySkill[id].lvl2 into SkillBarChart (SkillDatum has lvl2 only). lvl1 already lives in the SkillRollup — it is just never surfaced. Answers user Q3 (ทำได้แต่ต้องมีคนนำ vs ทำได้โดยไม่ต้องมีคนนำ).
  Goal: SkillBarChart + app/page.tsx render both lvl1 and lvl2 per skill across all 17 skills (grouped/stacked bars) with a tooltip that separates the two levels.
  How-Check: Run: load / and inspect the chart after npm run build. Expect: two values per skill, lvl1/lvl2 numbers match getBySkill(), build clean.
  Independent-of: T-003, T-004, T-005, T-006, T-007 (touches only the Home chart files — no shared source file).
  Relate File: app/page.tsx, components/SkillBarChart.tsx

## T-003: Skill+level worker finder surfacing site/contractor (answers Q4)
- [X] T-003 · P1 · done 2026-09-17 · attempts:1 · tool_calls:~30 · depends_on: — · WorkerTable gains an exact-level select (ทุกระดับ/ระดับ1/ระดับ2) client-side + "เจอมากสุดที่ <site> · ผรม <con>" summary. lib/data.ts left untouched (client-side filter → param would be dead code). Browser-verified (s07+lvl2 → 7 workers) + independent codecheck confirm.
  Title: Filter workers by a chosen skill AND exact level, showing which site + contractor they are at
  ContextTask: WorkerFilters.skillId currently keeps workers with that skill at level >= 1 only (lib/data.ts:108). Answering user Q4 (find workers with skill X at level Y — which site, which contractor) needs an exact-level filter (1 / 2 / at-least-1) and a result view that highlights site + contractor.
  Goal: /workers gains a skill selector + level selector; results show site and contractor columns and a short "found most at <site>/<contractor>" summary.
  How-Check: Run: pick s07 + level 2 on /workers. Expect: only workers with s07=2 listed, each with site + contractor, and a summary naming the top location.
  Independent-of: T-004, T-005, T-006 (shares lib/data.ts but edits WorkerFilters/listWorkers, distinct from the round-write and trend accessors).
  Relate File: lib/data.ts, components/WorkerTable.tsx, app/workers/page.tsx

## T-004: Round-over-round trend by contractor × site (answers Q5)
- [X] T-004 · P1 · done 2026-09-18 · attempts:1 · tool_calls:~55 · depends_on: T-006 · VERIFIED: getRoundTrend + pure diffRollups (round-over-round lvl1/lvl2/workers delta by site & contractor) built; runnable test lib/trend.test.ts C1–C6 exit 0; tsc clean; INDEPENDENT fresh-context codecheck S1–S4 all verdict:confirm (adversarial mutation proved the test bites). UI app/trends + TrendTable + Nav link; browser-verified the single-round degrade path. LIMIT: 2-round delta VISUAL confirmable only with real 2-round data (R15 db-gate) — math proven by unit test. depends_on: T-006
  Title: Trend view — level-1/level-2 headcount change per contractor and per site across rounds
  ContextTask: lib/data.ts reads only the current round; there is no cross-round comparison. Answers user Q5 (is skilled headcount rising or falling, and at which site). Needs a data accessor that reads two rounds and diffs their group rollups.
  Goal: Read current + previous round; render delta (this round vs last) of lvl1 and lvl2 headcount grouped by contractor and by site, with up/down indicators.
  How-Check: Run: seed two rounds then open the trend page. Expect: +N/−N per contractor×site for lvl1 and lvl2; single-round state degrades gracefully ("only one round").
  Independent-of: T-003, T-007 (shares lib/data.ts / lib/types.ts but adds a new cross-round accessor, not the same symbols).
  Relate File: lib/data.ts, lib/types.ts, app/trends/page.tsx

## T-005: Skill proportion + critical-shortage flagging (answers Q6)
- [X] T-005 · P1 · done 2026-09-18 · attempts:1 · tool_calls:~50 · depends_on: T-004 · VERIFIED: PURE flagSkill (strict < on 70/50/20 · N<=0 guard) + buildCriticality (17 skills · per-group breach vs own headcount) + getCriticality (thin, degrades) in lib/data.ts; types in lib/types.ts; runnable test lib/criticality.test.ts C1–C8 exit 0; tsc clean; /criticality page + CriticalityTable (presentational) + Nav link, browser-verified (17/17 flagged on fixture, per-group breach filtering works, 0 console errors); INDEPENDENT fresh-context codecheck S1–S4 all verdict:confirm (mutation < to > made 6 cases fail then restored). SCOPE: static current-round slice only — trend-pairing ("approaching threshold") deferred (needs per-skill cross-round accessor + 2-round data, R15 db-gated). No engine change → no Propagation.
  Title: Per-skill level-1/level-2 proportion with a critical-shortage flag by site/contractor
  ContextTask: Answers user Q6. The critical rule is CONFIRMED (2026-09-17), proportion-based; denominator = all workers in the scope (overall, or within one site/contractor group). Three INDEPENDENT flags per skill: (a) proficient at either level (lvl1+lvl2)/total < 70% → skill-shortage risk (เสี่ยงขาดทักษะ); (b) level-1 share lvl1/total < 50% → operator shortage (ขาดผู้ปฏิบัติ); (c) level-2 share lvl2/total < 20% → leader/trainer shortage (ขาดผู้นำ/สอนงาน). Each flag is raised on its own. The static flags need only the current round (buildable as a first slice); the "trending toward critical" part of Q6 uses the round-over-round delta from T-004.
  Goal: Per skill, compute the three proportions against the scope total, raise each flag independently, red-flag the skill, and name the sites/contractors that breach it; pair with the T-004 trend so a skill approaching a threshold is visible.
  How-Check: Run: open the criticality view on seeded data where skill s07 has (lvl1+lvl2)/total = 65%, lvl1/total = 45%, lvl2/total = 15%. Expect: s07 raises all three flags (เสี่ยงขาดทักษะ / ขาดผู้ปฏิบัติ / ขาดผู้นำ) naming the breaching site/contractor, while a skill at 80/55/25 raises none.
  Independent-of: T-003, T-006 (shares lib/data.ts but consumes trend output via a distinct criticality accessor).
  Relate File: lib/data.ts, app/criticality/page.tsx, components/

## T-007: Rollup tables also show level-1 (supplements Q1–Q2)
- [X] T-007 · P2 · done 2026-09-17 · attempts:1 · tool_calls:~30 · depends_on: — · RollupTable adds a ระดับ1(รวม) column (computed lvl1Of = sum bySkill[*].lvl1) before ระดับ2; no type/schema change. Browser-verified + independent codecheck confirm.
  Title: /sites rollup tables include a level-1 column, not just level-2
  ContextTask: RollupTable / GroupRollup currently expose workers + lvl2 only. Adding lvl1 gives a fuller picture of each site/contractor alongside the Q1–Q2 headcounts.
  Goal: RollupTable shows both a level-1 and level-2 column per site and per contractor group.
  How-Check: Run: open /sites after the change. Expect: level-1 and level-2 columns render per group, totals match bySite/byContractor rollups.
  Independent-of: T-004, T-006 (shares lib/types.ts but only adds a display column, no schema change).
  Relate File: components/RollupTable.tsx, app/sites/page.tsx, lib/types.ts

## T-008: Linked scope filter — pick a site/contractor once, every view re-scopes
- [ ] T-008 · P1 · depends_on: —
  Title: Global filter bar (site + contractor) that re-scopes all views, with URL state, active-filter chips, and a clear button
  ContextTask: User wants click-to-filter interactivity (confirmed 2026-09-17): choosing a scope should filter every view at once — the easiest path to answers. This is the SHARED foundation the drill-downs T-009..T-012 hook into. Data accessors must accept a {site?, contractor?} scope and recompute rollups for it (single source for scope).
  Goal: a sticky filter bar with site + contractor selectors; selection recomputes overview KPIs, skill chart, and criticality for that scope; scope stored in the URL query (?site=&contractor=) so a filtered view is shareable/bookmarkable; active filters shown as removable chips plus a "ล้างตัวกรอง" clear.
  How-Check: Run: pick contractor "หจก. ศรีสมบูรณ์", reload the page, then remove the chip. Expect: KPIs/chart/criticality scope to that contractor, the scope survives reload via the URL, and clearing returns to the all-scope view.
  Independent-of: T-009, T-010, T-011, T-012 (they consume this bar; it does not depend on them).
  Relate File: lib/data.ts, components/FilterBar.tsx, app/layout.tsx

## T-009: Click a skill → jump to the workers who have it (chart → finder)
- [ ] T-009 · P1 · depends_on: T-002, T-003
  Title: Skill chart bars are clickable and open the worker finder pre-filtered by that skill and level
  ContextTask: Answers the natural next question after seeing a skill's level split (Q3 → Q4): "who are they, where?". The overview skill chart (T-002) and the finder (T-003) already exist; this links them.
  Goal: clicking a skill row opens the finder pre-set to that skill; clicking a specific level segment (ระดับ 1 / ระดับ 2) also pre-sets the level.
  How-Check: Run: click the ระดับ-2 segment of "โครงสร้างเหล็ก (เชื่อม)". Expect: the finder opens with skill = s07 and level = 2 already selected and results shown.
  Independent-of: T-010, T-011, T-012 (separate drill paths).
  Relate File: app/page.tsx, components/SkillBarChart.tsx, app/workers/page.tsx

## T-010: Click a site/contractor row → scope every view to that group
- [ ] T-010 · P1 · depends_on: T-007, T-008
  Title: Rows in the site/contractor tables drill down by setting the global scope filter
  ContextTask: Answers the Q1/Q2 drill-down — from "how many at each group" to "show me everything about this group". REUSES the T-008 scope filter rather than a separate mechanism (single source for scope).
  Goal: clicking a site or contractor row sets the T-008 scope to that group and navigates to the scoped overview; the active-filter chip reflects it.
  How-Check: Run: on the sites tab, click the "ไซต์ B – คอนโดพระราม 9" row. Expect: global scope = that site, overview + criticality recompute for it, and the site chip is shown.
  Independent-of: T-009, T-011, T-012 (separate drill paths).
  Relate File: components/RollupTable.tsx, app/sites/page.tsx, lib/data.ts

## T-011: Click a critical flag → the sites/contractors and workers behind it
- [ ] T-011 · P1 · depends_on: T-005, T-003
  Title: A flagged skill drills into where the shortage is and who does have the skill
  ContextTask: Answers the action question behind Q6 — a red flag is only useful if it says where to fix it. Links criticality (T-005) to the group ranking + finder (T-003).
  Goal: clicking a flagged skill (or a specific flag) shows that skill's proportion ranked by site and by contractor (worst first) and offers a one-click jump to the finder for that skill.
  How-Check: Run: click the 🔴 flag on "โครงสร้างคอนกรีต (Precast)". Expect: a breakdown lists the sites/contractors with the lowest proficiency for Precast and a link opens the finder filtered to Precast.
  Independent-of: T-009, T-010, T-012 (separate drill paths).
  Relate File: app/criticality/page.tsx, lib/data.ts, app/workers/page.tsx

## T-012: Click a trend cell → which skills drove the change
- [ ] T-012 · P2 · depends_on: T-004
  Title: Expanding a contractor×site trend cell shows the per-skill deltas behind it
  ContextTask: Answers the "why" behind Q5 — a group's headcount moved, which skills moved it. Builds on the trend view (T-004).
  Goal: clicking a ผรม×ไซต์ trend cell expands a per-skill lvl1/lvl2 delta breakdown for that group between the two rounds.
  How-Check: Run: click a ▼ (falling) cell in the trend table. Expect: an inline breakdown lists the skills whose lvl1/lvl2 counts dropped most for that contractor×site.
  Independent-of: T-009, T-010, T-011 (separate drill paths).
  Relate File: app/trends/page.tsx, lib/data.ts

## T-013: Criticality table shows the "no-skill" group as its own column (refines T-005)
- [X] T-013 · P2 · done 2026-09-18 · attempts:1 · tool_calls:~30 · depends_on: T-005 · VERIFIED: additive — SkillProportion gained none+nonePct (lib/types.ts); proportionFor returns none:counts.none, nonePct:counts.none/denom with the same denom guard (lib/data.ts); test C7b/C7c assert none exposed + the nonePct+lvl1Pct+lvl2Pct=1 invariant (lib/criticality.test.ts, exit 0); "ไม่มีทักษะ" grey column added between ทำได้ and ระดับ1 (components/CriticalityTable.tsx). tsc clean; browser GET /criticality 200 → column renders, rows sum ≈100% (per-cell rounding ±1%, underlying exact). INDEPENDENT codecheck S1+S2 verdict:confirm (S1 mutation_bit:true — flip made C7b/C7c fail, reverse-edit restored). flags/thresholds/breach logic UNTOUCHED. No engine change → no Propagation.
  Title: Surface the third proficiency group (ไม่มีทักษะ / level 0) as an explicit column on /criticality
  ContextTask: T-005 shows only ระดับ1 + ระดับ2 + a combined ทำได้(ร1+ร2). The third group — ไม่มีทักษะเลย (level 0) — is only implicit (100% − ทำได้%). User confirmed exactly 3 groups per skill (none/lvl1/lvl2 already in SkillRollup); none is one combined bucket (no separate "no-level" bucket). Data exists; SkillProportion just doesn't expose none/nonePct.
  Goal: each row shows ไม่มีทักษะ · ระดับ1 · ระดับ2 explicitly, summing to 100% (the none+lvl1+lvl2 invariant). Additive display only — no flag/threshold change.
  How-Check: Run: open /criticality. Expect: a "ไม่มีทักษะ" column; for any row ไม่มีทักษะ% + ระดับ1% + ระดับ2% = 100% (e.g. อลูมิเนียม 63/30/7). npm run test:criticality asserts none/nonePct + the 100% invariant, exit 0.
  Out-of-Scope: flag rules + breaching-group logic (unchanged from T-005).
  Relate File: lib/types.ts, lib/data.ts, lib/criticality.test.ts, components/CriticalityTable.tsx

## T-014: Per-skill per-company "ไม่มีทักษะ" (none) drill-down on /criticality (refines T-013)
- [ ] T-014 · P2 · depends_on: T-013
  Title: Show WHICH companies the no-skill (level-0) workers are in, per skill
  ContextTask: T-013 added the overall ไม่มีทักษะ % but it aggregates all companies together, so you can't tell where the level-0 workers are (user: "Aluminum ไม่มีสกิล 2 คน อยู่บริษัทไหน"). Data (GroupRollup.bySkill[skillId].none per site/contractor) already exists; SkillCriticality just doesn't expose it. User approved Option 1 (drill-down, ALL companies with none>0, not only flag-breaching).
  Goal: each skill's ไม่มีทักษะ cell expands (native <details>) to list every site + contractor with ≥1 level-0 worker for that skill, with counts (e.g. ไซต์: A 8 · B 1 / ผรม: ผรม.X 7).
  How-Check: Run: npm run test:criticality (C9 asserts noneSites desc-sorted + zero-none exclusion), then open /criticality and expand a skill's ไม่มีทักษะ cell. Expect: test exit 0; the cell lists per-company names + counts; a skill nobody lacks shows a plain %.
  Out-of-Scope: flag rules / thresholds / breach logic (T-005) UNCHANGED; no new headcount metric; no new page; no DB change.
  Relate File: lib/types.ts, lib/data.ts, lib/criticality.test.ts, components/CriticalityTable.tsx

- [X] T-015 · P1 · depends_on: — · done 2026-09-22 · attempts:1 · tool_calls:24
  Title: Redesign the home dashboard (/) to the signed-off Canva layout, simpler + action-first
  ContextTask: User found the table-heavy dashboard hard to read; approved a simpler Canva-based single page. Metric LOCKED %skilled = (Lv1+Lv2)/(Lv1+Lv2+Zero) over worker×skill cells; single 65% threshold. Q3/Q5 dropped; Q4 = position filter + drill-down; Q6 = scatter with 65% line. Computed from the worker LIST (each Worker.totals carries l0/l1/l2 + position) so a position filter can re-render every chart; worker rows slimmed to non-PII {site,contractor,position,l0,l1,l2} before reaching the browser.
  Goal: home page shows donut (cells 0/1/2) + KPIs (%skilled, %independent) + 100%-stacked bars by site (6) and contractor (Top 10) + scatter (X=headcount, Y=%skilled, dashed 65% line, green/red zones, site/contractor toggle) + a position filter that re-renders all charts + a drill-down WORKER-LEVEL searchable table under the scatter (Option B, user-chosen for internal record lookup).
  How-Check: Run: npm run test:dashboard (locked formula + position filter) and npx tsc --noEmit; then open / . Expect: test + tsc exit 0; all charts render; changing the position filter re-renders every chart; scatter 65% line + zones + toggle work; drill-down table searchable by name/code and reacts to the position filter + a clicked scatter dot. NOTE: worker code+name DO reach the browser by design (Option B, internal-org tool — accepted exception to data.ts "no PII to browser"); per-skill map + assessor/date stay server-side.
  Out-of-Scope: other pages (/sites, /workers, /criticality, /trends) + their components UNCHANGED; trend/criticality machinery in lib/data.ts untouched; real 1531-worker numbers need the master .xlsx + npm run import (user-supplied).
  Relate File: lib/dashboard.ts, lib/dashboard.test.ts, components/Dashboard.tsx, app/page.tsx, package.json

## T-016: Import the master assessment workbook → real 1531-worker data
- [ ] T-016 · P1 · depends_on: — · Independent-of: T-015 (data-only delivery; no code change)
  Title: Place the master assessment .xlsx in data/ and run the import so every page shows real numbers
  ContextTask: All pages (/ dashboard, /sites, /workers, /criticality, /trends) run on the 60-worker DEV fixture (data/normalized.json). Confirmed 2026-09-22: NO .xlsx/.xls/.csv exists anywhere in the repo — data/ holds only the fixture. data/ is git-ignored (worker PII) so the master file is never committed; the data owner must place it on the machine that runs the import. Code is data-shape-driven — NO code change needed, only the source file. Full operator runbook: docs/TICKET-import-assessment-data.md.
  Goal: real numbers (≈1531 workers / 6 sites / 59 contractors) render across the app.
  How-Check: (1) copy the master workbook to data/<any-name>.xlsx (importer takes the first non-~$ .xlsx — scripts/import.ts findWorkbook ~line 70); it must have a sheet named exactly "ประเมินรายบุคคล", data from row 3, 17 base skill cols in {0,1,2} per lib/xlsxMap.ts. (2) optional Firestore write needs .env + serviceAccount*.json (both git-ignored). (3) Run: npm run import. Expect: exit 0, no "domain violation" warnings, data/normalized.json regenerated with real head-count; open / and the head-count KPI reads ≈1531 not 60.
  Out-of-Scope: NO code change — pure data delivery. Parse failure = fix the workbook (sheet name / columns / values), not the importer.
  Relate File: scripts/import.ts, lib/xlsxMap.ts, data/normalized.json (output), docs/TICKET-import-assessment-data.md
