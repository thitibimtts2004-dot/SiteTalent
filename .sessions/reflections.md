
## 2026-09-24 · T-008 global scope filter
- intent: one site/contractor pick re-scopes every view, kept in the URL.
- outcome: done — shared rollupWorkers (parity-tested vs import), Scope helpers, FilterBar + scope-carrying Nav, 4 pages scoped; browser click-through passed.
- friction: the in-app browser pane goes hidden when not shown → Suspense reveal + hydration stall; fix = preview_start {url} to open the pane visibly before interactive checks.
- lesson: the SSR stream shows the Nav Suspense fallback (unscoped links) until reveal; harmless when visible, but a click before hydration drops the scope.
- promoted_patterns: none
