# Gather Complete — T-008
task_id: T-008
generated_at: 2026-09-24
task: T-008 global scope filter (site + contractor) across all views
[kb-consulted] python3 lookup.py "filter scope" → 0 matches (novel topic) · 2026-09-24

objective: one scope (?site=&contractor=) re-scopes /sites, /workers, /criticality, /trends; home (/) keeps its T-018 bar on the same URL keys.
decisions (user confirmed 2026-09-24 "ตามที่แนะนำ"):
  1. no global bar on "/" — Dashboard's own bar already reads/writes ?site=&contractor=
  2. Nav links carry ?site=&contractor= across pages
  3. /sites recomputes rollups from scoped workers
  4. /trends filters rows only (no recompute — needs previous-round workers)
constraints: rollups today are import-time summary docs → scoped views recompute from listWorkers(scope) via a pure rollup fn that must match import.ts build() exactly; unscoped path keeps the cheap summary-doc reads. scripts/** owned by harness_editor → import.ts dedupe optional/last.
affected_files: lib/rollup.ts(new) lib/rollup.test.ts(new) lib/scope.ts(new) package.json lib/data.ts components/FilterBar.tsx(new) components/Nav.tsx app/layout.tsx app/sites/page.tsx app/workers/page.tsx app/criticality/page.tsx app/trends/page.tsx scripts/import.ts(optional)
acceptance_criteria: roadmap T-008 How-Check (pick contractor, reload keeps scope, chip remove → all-scope) + rollup parity test vs fixture + tsc clean + existing suites pass.
