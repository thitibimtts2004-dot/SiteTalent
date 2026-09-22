# Reflections — T-002 / T-003 / T-007 quick-win display tickets (closed 2026-09-18)

## Intent
Ship the three display-layer "quick wins" that work on existing sample data — surface
level-1 alongside level-2 everywhere the dashboard already showed only level-2:
- T-002: home skill chart → stacked lvl1+lvl2 per skill (answers Q3)
- T-003: worker finder by skill AND exact level + "found most at" location summary (answers Q4)
- T-007: rollup tables gain a level-1 column (supplements Q1/Q2)

## Outcome
All three built, browser-verified on synthetic data, and independently codecheck-confirmed
(fresh-context outsider, tsc clean, all-CONFIRM). Files changed exactly matched the plan's
declared scope: SkillBarChart.tsx, app/page.tsx, WorkerTable.tsx, RollupTable.tsx.

## [scope-creep] — two out-of-ticket changes, justified
1. `.claude/launch.json` — repointed the dev server to run Next 15 under the absolute Node 20
   binary. Necessary, not feature work: the nvm default is Node 16.20.2, which cannot run
   Next 15 at all (`next dev` fails), so nothing could be verified without it. Infra-only.
2. `data/normalized.json` — a SYNTHETIC fixture (60 fake workers, seeded generator). The
   `data/` dir is gitignored (holds real worker PII) and was absent, so the dashboard 500'd
   with ENOENT. Generated fake-only data purely to run the browser verification. Gitignored,
   never real PII, user can drop the real file in to replace it. Not shipped feature code.
Both are enablers for verification, outside the tickets' File: scope but declared here.

## Friction
- danger_gate blocked the mece_plan.md write until a plan-owner skill (`mece`) was loaded —
  correct behavior, cost one detour.
- Node 16 default vs Next 15 requirement was the biggest time sink; caught via `next: command
  not found` → npm install → Node-version mismatch.
- Real context crossed the 200k ceiling mid-task, forcing the close to defer past /compact.
- A low-res (800x600) screenshot made the stacked bars look detached; zoom disproved it — a
  render artifact, not a bug. Lesson below.

## Lessons
- Verify visual claims at adequate resolution before calling something a bug (zoom, don't
  trust a thumbnail).
- When a plan section only filters client-side, do NOT also edit the data-layer accessor —
  that edit is dead code (YAGNI). The skeptical review caught this on S2 (dropped lib/data.ts).
- For a display-only task on sample data, the fixture + runtime setup can dominate the effort;
  budget for "can I even run it" before "is the feature right".

---

# Reflections — T-006 round-import VERIFICATION (closed 2026-09-18)

## Intent
Verify the round-aware import pipeline works — the PRINCIPLED way the user demanded after
rejecting my earlier "I read the code, please accept it" approach (CFP-1): a runnable test
that exercises the REAL code + an independent fresh-context checker (doer != checker).

## Outcome
T-006's round contract was already implemented in scripts/import.ts. Added a minimal DI param
+ export + entry guard to make upsertFirestore testable, wrote scripts/import.round.test.ts
(fake Firestore, cases C1-C4), and spawned an independent adversarial checker that RAN the test
and confirmed both sections. test exit 0, tsc clean, codecheck S1+S2 confirm.

## Friction
- Ownership gate: scripts/** is owned by harness_editor in the manifest (engine default treats
  scripts/ as engine territory), so editing this app's scripts/import.ts required loading
  harness_editor purely to satisfy Gate 1 — a genuine mismatch between the engine's default
  owns_paths and a consumer app whose real code lives in scripts/. Worked around by loading
  harness_editor + documenting NO engine propagation (change is app code). Longer-term fix would
  be a per-project ownership override, out of scope here.
- The test itself CAUGHT a real integration bug in my first attempt: importing ./import ran
  main() at module load (findWorkbook crash). Fixed with an entry-point guard — a defect the
  "read the code" approach would never have surfaced. This is the whole point of testing.

## Lessons
- CFP-1 in action: a passing test answers "does it work"; reading answers "does it exist". The
  entry-guard bug is proof reading is not enough — the test found what a code-read missed.
- Make the checker adversarial and have it RUN the artifact + try to break it (flip a fake's
  merge to replace) — a checker that only reads is just a second reader, not independent proof.
- Dependency injection with a default arg (`db = getAdminDb()`) is a zero-behavior-change way to
  make an internally-wired function testable without an emulator.

---

# Reflections — T-004 round-over-round trend (closed 2026-09-18)

## Intent
Build the trend view (Q5): lvl1/lvl2/workers change this round vs previous, per site & contractor,
with up/down indicators + graceful single-round degrade. Same principled discipline as T-006
(runnable test + independent doer≠checker), now enforced automatically because lib/ is a code_root.

## Outcome
Shipped a PURE diffRollups (unit-testable, no DB), a cross-round accessor getRoundTrend (DI, degrades
safely), a runnable C1–C6 test, and the /trends page + presentational table + Nav link. test exit 0,
tsc clean, browser-verified the single-round path, and a fresh-context checker confirmed all 4 sections
(adversarial mutation made the test fail then restored byte-identical).

## Friction
- The gate stack fired in sequence on the FIRST [X] and taught the real contract piece by piece:
  Gate 5 codecheck (lib/ IS a code_root here, not just scripts/src → every section needs an independent
  codecheck proof) → spawn_gate (a model_medium/parallel section needs either a spawn proof or a literal
  "main context" MAIN marker) → the MAIN marker string must be exactly "main context" (MAIN_MARKERS).
  Each block was legitimate; the lesson is to author the plan with these in mind, not discover them at [X].
- I initially omitted the "- [ ] S<N>" checkbox lines from each section block (wrote the fields but not
  the tickable line) — the close-gate needs them. Add the checkbox line when authoring each section.
- Declaring sections "parallel" in the cycle grouping while actually building them inline in main context
  tripped spawn_gate (parallel ⇒ expects a spawn proof). If you run inline, label the cycle serial.

## Lessons
- RUN, don't read: the run caught a real CJS/top-level-await bug (tsx emits CommonJS → top-level await
  unsupported → wrap async cases in an IIFE). A code-read would have shipped it broken. CFP-1 again.
- Put a test where the tested code's OWNER can edit it: lib/*.test.ts (coder-owned) avoids the T-006
  scripts/** = harness_editor ownership detour entirely. Colocation > convention here.
- Skeptical review earns its keep on simplicity: it downgraded TrendTable from a client component to a
  plain presentational one (no interaction in the ticket → no "use client") — the same YAGNI catch as T-003.
- Report honest limits: the 2-round delta VISUAL is unverifiable without real 2-round data (db-gated), so
  the plan + roadmap state that explicitly rather than implying the whole feature was eyeballed.

---

# Reflections — T-005 skill proportion + critical-shortage flagging (closed 2026-09-18)

## Intent
Build the criticality view (Q6): per-skill lvl1/lvl2 proportion vs the scope worker total, raising three
independent shortage flags (skill/operator/leader, strict `<` on 70/50/20%), red-flagging the skill and
naming the sites/contractors that breach. Same principled discipline as T-004/T-006 (runnable test +
independent doer≠checker), now habitual.

## Outcome
Shipped PURE flagSkill + buildCriticality (no I/O → unit-testable), a thin getCriticality that composes the
existing round-aware/fixture-degrading accessors, a C1–C8 runnable test (exit 0), and /criticality page +
presentational table + Nav link. tsc clean; browser-verified on the fixture (17/17 skills flagged — the
synthetic data genuinely has low proficiency; per-group breach filtering confirmed by ติดตั้งรั้ว excluding
site B); independent fresh-context codecheck confirmed all 4 sections (mutation `<`→`>` made 6 cases fail,
then restore re-passed).

## Friction
- The codecheck agent's prescribed mutation-restore step used `git checkout lib/data.ts`, which was UNSAFE
  here: the T-004/T-005 work in that file is uncommitted (HEAD = initial commit only), so the checkout wiped
  ~261 lines of real feature code. The agent caught it, reconstructed the file, and I independently re-verified
  (symbols present, both test suites pass, tsc clean, diff-stat back to 261). No damage, but a real hazard.
- Reusing T-004's exact plan shape made the gate stack (plan_lint → skeptical → scrutinize → codecheck →
  spawn) pass first-try with zero blocks — the second time through, the contract was internalized.

## Lessons
- Mutation testing on UNCOMMITTED code must NOT use `git checkout <file>` to restore — that reverts to HEAD,
  not to the pre-mutation working state. Restore by reversing the exact edit (or snapshot the file to a temp
  path first). Flag this in any future codecheck prompt: "if the file is uncommitted, restore by reverse-edit,
  not git checkout." (Candidate CFP if it recurs.)
- Always independently re-verify a file an external agent modified — do not trust "I restored it exactly".
  A 2-command check (grep symbols + run tests) turns a claimed restore into a proven one.
- The pure-core / thin-glue split keeps paying off: ALL the logic (and all the test surface) lives in the pure
  functions; getCriticality is glue verified by the browser. Honest scoping (not claiming full DI) avoided
  over-promising.
- Deferring the trend-pairing ("approaching threshold") was correct — it needs a per-skill cross-round accessor
  (T-004's trend is per-group totals) and 2-round data that is db-gated. Build the provable slice; don't
  speculate on unverifiable data.

---

# Reflections — T-013 show the "no-skill" group as its own column (closed 2026-09-18)

## Intent
User tested T-005's /criticality view and pointed out that there are three proficiency groups, not
two — the third (ไม่มีทักษะ / level 0) was only implicit (100% − ทำได้%). Surface it explicitly so
each row shows ไม่มีทักษะ · ระดับ1 · ระดับ2 summing to 100%. Same principled discipline (runnable
test + independent doer≠checker).

## Outcome
Additive only: exposed the already-existing `none` count via SkillProportion.none/nonePct, added a grey
column, and asserted the nonePct+lvl1Pct+lvl2Pct=1 invariant in the test (C7c). tsc clean; browser-verified;
both independent codechecks confirmed (S1 mutation bit proved the test bites; the S1 agent restored its
mutation by reverse-edit, not git checkout — the T-005 hazard was pre-empted in the spawn prompt).

## Friction
- The skeptical-gate BLOCKED the first edit with "mece_plan covers a DIFFERENT task (task_id mismatch)":
  active_thread.md still pointed at the CLOSED T-005 while the new plan was T-013. The gate compares the
  live plan's task_id against the active task. Fix: update active_thread.md to the new task_id (phase:
  in_progress) BEFORE the first Phase-3 edit on a follow-up task in the same session. This is the
  same-chat "new task after a closed one" seam — Phase 0 C2 says "force Phase 1+2", but active_thread
  must also be re-pointed or the gate fires.

## Lessons
- On a follow-up task in the same session, re-point active_thread.md (task: + phase: in_progress) at plan
  time, not just at close — the skeptical/codecheck gates key off active_thread's task_id vs the plan's.
- Pre-empting a known hazard in the SPAWN PROMPT works: the T-005 git-checkout-wipe was avoided this time
  because the codecheck prompt explicitly said "uncommitted → restore by reverse-edit, not git checkout,
  copy the original line first". A logged hazard becomes a prevention when it's written into the next prompt.
- Chose the honest data-layer field (real none count, testable) over the cheaper component-side 1−ทำได้%
  derivation. Cost one more file + a codecheck, bought an exact, unit-tested invariant. The right trade for
  a "principled proof" user.
- Cosmetic honesty: per-cell Math.round can make a row display 99–101% while the true proportions sum to
  exactly 100%. Surfaced this to the user rather than hiding it; offered a sum-to-100 rounding fix if wanted.



##  — T-015 dashboard redesign
- intent: replace table-heavy home dashboard with signed-off Canva layout (donut+KPIs+stacked bars+scatter+position filter+worker drill-down)
- outcome: shipped 3 sections, all Verify-N pass, browser-verified, user-approved
- friction: 3 review gates fired live in the Code tab (scrutinize, casetest, close-gate) — each needed its proof/ack; roadmap_lint re-flagged pre-existing T-008 (left as-is)
- lesson: on this surface hooks DO enforce live; load scrutinize + arm close ack early to avoid mid-close blocks
- promoted_patterns: single aggregate() feeds every chart + the table (single-source, no drift)
