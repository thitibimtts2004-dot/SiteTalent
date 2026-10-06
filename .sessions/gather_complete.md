# Gather Complete — HR req #4 (skill-shortage → who can help)

date: 2026-10-06
task: Wire /criticality flagged-skill → /workers pre-filtered to people who have that skill (HR requirement #4)

[kb-consulted] Prior art read in-repo: T-008 scope mechanism (lib/scope.ts), T-010 row→link pattern (RollupTable next/link), WorkerTable existing client skill filter + "เจอมากสุดที่" hint. No new mechanism needed — reuse next/link + existing WorkerTable skill filter.

## Findings
- components/CriticalityTable.tsx: presentational (no "use client"). Skill label at L122 `{s.label}`, each row has `s.skillId`. Not clickable yet.
- components/WorkerTable.tsx: "use client". Skill filter = useState("") at L26, NOT seeded from URL. `<select>` option values = SKILLS[].id (s01..s17) at L105-112. Has topSite/topCon hint (L130-145) that already answers "who has it, where" when a skill is set. lvl select disabled until skill set; skill set + no lvl → shows lvl>=1 (all who can do it).
- app/workers/page.tsx: reads scope only (scopeFrom). Does NOT read ?skill=. Passes workers/sites/contractors to WorkerTable.
- lib/skills.ts: SKILLS id s01..s17 — matches the select option values, so ?skill=s07 selects directly.
- lib/scope.ts: scopeQuery builds ?site=&contractor=. NOT needed here (decision D1 = drop scope).

## Decisions
- D1 (user-confirmed): the finder link searches the WHOLE org — `/workers?skill=<id>` with NO scope. Rationale: req #4 = find a helper from ANOTHER site, so scoping to the lacking site would return empty.
- D2: make EVERY skill label clickable (not just flagged) — universal "who can do X"; flagged rows already highlighted red.
- D3: pass only `skill` (not lvl) → finder shows all proficient (lvl>=1); HR narrows to lvl2 in-page.
- D4: link via next/link <Link>; CriticalityTable becomes a client component OR Link works in a server component (next/link is fine in server components). Keep CriticalityTable server (no "use client" needed — <Link> renders server-side).

## Constraints
- No src/ in repo (components/app/lib outside code_root) · never build while dev runs · user pushes · no harness engine edits.
