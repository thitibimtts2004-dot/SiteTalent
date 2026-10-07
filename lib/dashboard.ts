/**
 * Pure aggregation for the redesigned home dashboard (T-015).
 *
 * Every dashboard number is computed from the worker LIST — each worker carries
 * level counts (l0/l1/l2 over the 17 skills) plus site/contractor/position — so a
 * position filter can re-render every chart client-side. This module holds NO
 * React and NO data access; it is a pure, testable core.
 *
 * Metrics are PEOPLE-based (re-signed 2026-10-07 — the old cell-based %skilled read
 * ~15% beside a donut showing ~68% of people at level 2, and could never reach 65%):
 *   %skilled       = p2 / (p0 + p1 + p2)   — share of PEOPLE with ≥1 skill at level 2
 *   %independent   = p2 / (p1 + p2)        — of the people who can do something, how many reach level 2
 * `cells` (worker×skill counts) is still returned for reference only.
 *
 * PEOPLE view (KPIs, donut, stacked bars, scatter): each worker counts ONCE, at the highest
 * level they reach across the in-scope skills (one skill filtered → that skill's
 * level). Cells inflate "level 0" because a specialist is counted as unable in
 * the ~15 trades that are not theirs; people answer "how many workers are ready".
 * Both are returned as PERCENTAGE POINTS (0..100) so the scatter's 65% line reads y=65.
 */
import type { Worker } from "./types";
import { SKILLS, SKILL_IDS } from "./skills";

/** The slim, browser-safe shape sent to the client. For this INTERNAL tool the
 *  user accepted worker code+name reaching the browser (drill-down search table);
 *  per-skill LEVELS travel as the compact `sk` digits (not PII); assessor/date are dropped. */
export interface ClientWorker {
  code: string;
  name: string;
  site: string;
  contractor: string;
  position: string;
  l0: number; // skills at level 0 (ทำไม่ได้/ไม่ได้บันทึก)
  l1: number; // skills at level 1 (ทำได้บางส่วน)
  l2: number; // skills at level 2 (ทำได้ผ่านมาตรฐาน)
  /** per-skill level as one digit each, in SKILL_IDS order (e.g. "01200…", 17 chars) —
   *  lets the skill filter recompute every chart for a single skill. Not PII. */
  sk?: string;
}

/** The four home-dashboard filters; each is ONE value or unset (= all). */
export interface DashboardFilters {
  position?: string;
  site?: string;
  contractor?: string;
  skill?: string; // a SKILL_IDS id, e.g. "s01"
  level?: string; // "0" | "1" | "2" — each worker's HIGHEST in-scope level (donut slice)
}

export const LEVEL_KEYS = ["0", "1", "2"] as const;

/** One row of a site or contractor breakdown (drives the stacked bars + scatter). */
export interface GroupRow {
  name: string;
  headcount: number;
  l0: number;
  l1: number;
  l2: number;
  pctSkilled: number; // 0..100 — % of the group's people with ≥1 level-2 skill
  // people by their highest in-scope level (each worker counted once)
  p0: number;
  p1: number;
  p2: number;
}

/** People per level for ONE skill (each worker = 1 count at that skill's level). */
export interface SkillRow {
  id: string;
  label: string;
  l0: number;
  l1: number;
  l2: number;
}

/** Everything the dashboard renders for the current position filter. */
export interface DashboardData {
  cells: { l0: number; l1: number; l2: number };
  /** headcount split by each worker's highest in-scope level. IGNORES the level
   *  filter so the donut keeps all three slices and can highlight the chosen one. */
  people: { l0: number; l1: number; l2: number };
  /** people already at level 2 who ALSO hold a level-1 skill in scope — they sit in
   *  people.l2, so the level-1 bucket alone undercounts who can be trained further.
   *  Always 0 under a skill filter (one skill = one level per worker). */
  upskillable: number;
  pctSkilled: number; // 0..100
  pctIndependent: number; // 0..100
  headcount: number;
  siteCount: number; // distinct sites among the fully-filtered workers
  contractorCount: number;
  /** the fully-filtered workers (drives the drill-down table) */
  workers: ClientWorker[];
  // Cross-filter rule: each breakdown IGNORES its own filter (like the dropdown
  // options) so a clicked chart keeps every bar and just highlights the selection.
  bySite: GroupRow[]; // all sites, name asc
  byContractor: GroupRow[]; // Top 10 by headcount (desc), then name asc — for the stacked bar only
  allContractors: GroupRow[]; // EVERY contractor, same order — for the scatter + counts
  /** all 17 skills in SKILL_IDS order, over the scoped workers. IGNORES the skill
   *  filter on purpose: this chart compares skills against each other. */
  bySkill: SkillRow[];
  // filter options — each list ignores its OWN filter but honours the others,
  // so a dropdown never empties itself and only offers values that still exist
  positions: string[];
  sites: string[];
  contractors: string[];
}

type Levels = (w: ClientWorker) => { l0: number; l1: number; l2: number };

/** All 17 skills (the worker's own l0/l1/l2 totals). */
const allSkillLevels: Levels = (w) => w;

/** ONE skill: each worker contributes exactly one cell at that skill's level. */
function oneSkillLevels(skillId: string): Levels {
  const i = SKILL_IDS.indexOf(skillId);
  return (w) => {
    const lv = i < 0 ? 0 : Number(w.sk?.[i] ?? 0);
    return { l0: lv === 0 ? 1 : 0, l1: lv === 1 ? 1 : 0, l2: lv === 2 ? 1 : 0 };
  };
}

/** A worker's highest level across the in-scope skills (0 = none at level 1+). */
const topLevel = (v: { l1: number; l2: number }): 0 | 1 | 2 => (v.l2 > 0 ? 2 : v.l1 > 0 ? 1 : 0);

/** People per level for every skill. A worker with no `sk` counts as level 0. */
function skillRows(ws: ClientWorker[]): SkillRow[] {
  const rows = SKILLS.map((s) => ({ id: s.id, label: s.label, l0: 0, l1: 0, l2: 0 }));
  for (const w of ws) {
    rows.forEach((r, i) => {
      const lv = Number(w.sk?.[i] ?? 0);
      if (lv === 2) r.l2++;
      else if (lv === 1) r.l1++;
      else r.l0++;
    });
  }
  return rows;
}

/** Drop a full Worker to the browser-safe ClientWorker shape. */
export function slimWorker(w: Worker): ClientWorker {
  return {
    code: w.code,
    name: w.name,
    site: w.site,
    contractor: w.contractor,
    position: w.position,
    l0: w.totals.none,
    l1: w.totals.lvl1,
    l2: w.totals.lvl2,
    sk: SKILL_IDS.map((id) => String(w.skills[id] ?? 0)).join(""),
  };
}

/** p2/(p0+p1+p2) as 0..100 over PEOPLE counts. GUARD: 0 when there is nobody. */
export function pctSkilled(p0: number, p1: number, p2: number): number {
  const total = p0 + p1 + p2;
  return total === 0 ? 0 : (p2 / total) * 100;
}

/** p2/(p1+p2) as 0..100 over PEOPLE counts. GUARD: 0 when nobody can do anything. */
export function pctIndependent(p1: number, p2: number): number {
  const recorded = p1 + p2;
  return recorded === 0 ? 0 : (p2 / recorded) * 100;
}

/** Sum a set of workers into one GroupRow (name supplied by the caller). */
function rowFor(name: string, ws: ClientWorker[], levels: Levels): GroupRow {
  let l0 = 0;
  let l1 = 0;
  let l2 = 0;
  const p = [0, 0, 0];
  for (const w of ws) {
    const v = levels(w);
    l0 += v.l0;
    l1 += v.l1;
    l2 += v.l2;
    p[topLevel(v)]++;
  }
  return {
    name,
    headcount: ws.length,
    l0,
    l1,
    l2,
    pctSkilled: pctSkilled(p[0], p[1], p[2]),
    p0: p[0],
    p1: p[1],
    p2: p[2],
  };
}

/** Group workers by a key, returning one GroupRow per distinct value. */
function groupRows(
  ws: ClientWorker[],
  key: (w: ClientWorker) => string,
  levels: Levels,
): GroupRow[] {
  const buckets = new Map<string, ClientWorker[]>();
  for (const w of ws) {
    const k = key(w);
    const b = buckets.get(k);
    if (b) b.push(w);
    else buckets.set(k, [w]);
  }
  return [...buckets.entries()].map(([name, group]) => rowFor(name, group, levels));
}

/**
 * One fixed-locale collator for every sort here. aggregate() runs on BOTH the
 * server (SSR) and the browser; a bare localeCompare() uses each runtime's
 * default locale, so Thai/Latin labels sorted differently → hydration mismatch.
 */
const collator = new Intl.Collator("th");

/** Deterministic order: headcount desc, then name asc (kills sort ambiguity on ties). */
function byHeadcountThenName(a: GroupRow, b: GroupRow): number {
  if (b.headcount !== a.headcount) return b.headcount - a.headcount;
  return collator.compare(a.name, b.name);
}

/** Does worker `w` pass every set filter except the one named in `skip`?
 *  (skill narrows CELLS, not workers — it only matters here through `levels`.) */
function passes(
  w: ClientWorker,
  f: DashboardFilters,
  levels: Levels,
  skip?: keyof DashboardFilters,
): boolean {
  if (skip !== "position" && f.position && w.position !== f.position) return false;
  if (skip !== "site" && f.site && w.site !== f.site) return false;
  if (skip !== "contractor" && f.contractor && w.contractor !== f.contractor) return false;
  if (skip !== "level" && f.level && String(topLevel(levels(w))) !== f.level) return false;
  return true;
}

// blank values are dropped: an "" option would collide with the "all" option
const uniqSorted = (xs: string[]) =>
  [...new Set(xs.filter((x) => x.trim() !== ""))].sort(collator.compare);

/**
 * Aggregate the worker list into everything the dashboard renders.
 * position/site/contractor narrow WHICH workers count; skill narrows WHICH cells
 * count (one skill → one cell per worker). A bare string is read as `position`
 * (the original single-filter signature).
 */
export function aggregate(
  workers: ClientWorker[],
  filters: DashboardFilters | string = {},
): DashboardData {
  const f: DashboardFilters = typeof filters === "string" ? { position: filters } : filters;
  const levels = f.skill ? oneSkillLevels(f.skill) : allSkillLevels;

  const pass = (skip?: keyof DashboardFilters) => workers.filter((w) => passes(w, f, levels, skip));
  const scoped = pass();
  const total = rowFor("", scoped, levels);
  const donutBase = f.level ? rowFor("", pass("level"), levels) : total;

  const bySite = groupRows(f.site ? pass("site") : scoped, (w) => w.site, levels).sort((a, b) =>
    collator.compare(a.name, b.name),
  );
  const allContractors = groupRows(
    f.contractor ? pass("contractor") : scoped,
    (w) => w.contractor,
    levels,
  ).sort(byHeadcountThenName);
  const byContractor = allContractors.slice(0, 10);

  return {
    cells: { l0: total.l0, l1: total.l1, l2: total.l2 },
    people: { l0: donutBase.p0, l1: donutBase.p1, l2: donutBase.p2 },
    upskillable: scoped.filter((w) => {
      const v = levels(w);
      return v.l2 > 0 && v.l1 > 0;
    }).length,
    pctSkilled: total.pctSkilled,
    pctIndependent: pctIndependent(total.p1, total.p2),
    headcount: scoped.length,
    siteCount: new Set(scoped.map((w) => w.site)).size,
    contractorCount: new Set(scoped.map((w) => w.contractor)).size,
    workers: scoped,
    bySite,
    byContractor,
    allContractors,
    bySkill: skillRows(scoped),
    positions: uniqSorted(pass("position").map((w) => w.position)),
    sites: uniqSorted(pass("site").map((w) => w.site)),
    contractors: uniqSorted(pass("contractor").map((w) => w.contractor)),
  };
}
