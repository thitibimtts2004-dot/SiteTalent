
## 2026-09-24 · T-008 global scope filter
- intent: one site/contractor pick re-scopes every view, kept in the URL.
- outcome: done — shared rollupWorkers (parity-tested vs import), Scope helpers, FilterBar + scope-carrying Nav, 4 pages scoped; browser click-through passed.
- friction: the in-app browser pane goes hidden when not shown → Suspense reveal + hydration stall; fix = preview_start {url} to open the pane visibly before interactive checks.
- lesson: the SSR stream shows the Nav Suspense fallback (unscoped links) until reveal; harmless when visible, but a click before hydration drops the scope.
- promoted_patterns: none

## T-010 — row drill-down via scope (2026-10-06)
- intent: make rollup rows clickable to set the global scope + navigate to scoped overview.
- outcome: 2-file edit, reused T-008 scope; tsc + browser verified (site + contractor).
- friction: (1) skeptical-gate blocked first edit — active_thread still held T-008 (prev task), task_id mismatch; fixed by updating active_thread to T-010. (2) spawn_gate blocked [X] — Model: model_low/medium is binding; it only reads the header + Model: line, so a separate "MAIN:" line was ignored — the "main context" marker must sit ON the Model: line (or header). (3) close-gate needs .close_checklist_ack after reading §Close Checklist.
- lesson: on resume after a prior task close, re-point active_thread to the NEW task_id BEFORE the first edit; put MAIN marker on the Model: line, not a new line.
- promoted_patterns: reuse-the-URL-scope for all drill-downs (T-009/011/012 should follow the same shape).
