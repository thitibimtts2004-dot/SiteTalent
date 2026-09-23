/**
 * Pure aggregation for the redesigned home dashboard (T-015).
 *
 * Every dashboard number is computed from the worker LIST — each worker carries
 * level counts (l0/l1/l2 over the 17 skills) plus site/contractor/position — so a
 * position filter can re-render every chart client-side. This module holds NO
 * React and NO data access; it is a pure, testable core.
 *
 * Locked metric (signed-off):
 *   %skilled       = (l1 + l2) / (l0 + l1 + l2)   — over worker×skill CELLS, zeros included
 *   %independent   = l2 / (l1 + l2)               — of the recorded cells, how many are standard
 * Both are returned as PERCENTAGE POINTS (0..100) so the scatter's 65% line reads y=65.
 */
import type { Worker } from "./types";
import { SKILL_IDS } from "./skills";

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
}

/** One row of a site or contractor breakdown (drives the stacked bars + scatter). */
export interface GroupRow {
  name: string;
  headcount: number;
  l0: number;
  l1: number;
  l2: number;
  pctSkilled: number; // 0..100
}

/** Everything the dashboard renders for the current position filter. */
export interface DashboardData {
  cells: { l0: number; l1: number; l2: number };
  pctSkilled: number; // 0..100
  pctIndependent: number; // 0..100
  headcount: number;
  bySite: GroupRow[]; // all sites, name asc
  byContractor: GroupRow[]; // Top 10 by headcount (desc), then name asc — for the stacked bar only
  allContractors: GroupRow[]; // EVERY contractor, same order — for the scatter + counts
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

/** (l1+l2)/(l0+l1+l2) as 0..100. GUARD: 0 when there are no cells. */
export function pctSkilled(l0: number, l1: number, l2: number): number {
  const total = l0 + l1 + l2;
  return total === 0 ? 0 : ((l1 + l2) / total) * 100;
}

/** l2/(l1+l2) as 0..100. GUARD: 0 when nothing is recorded. */
export function pctIndependent(l1: number, l2: number): number {
  const recorded = l1 + l2;
  return recorded === 0 ? 0 : (l2 / recorded) * 100;
}

/** Sum a set of workers into one GroupRow (name supplied by the caller). */
function rowFor(name: string, ws: ClientWorker[], levels: Levels): GroupRow {
  let l0 = 0;
  let l1 = 0;
  let l2 = 0;
  for (const w of ws) {
    const v = levels(w);
    l0 += v.l0;
    l1 += v.l1;
    l2 += v.l2;
  }
  return { name, headcount: ws.length, l0, l1, l2, pctSkilled: pctSkilled(l0, l1, l2) };
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

/** Does worker `w` pass every set filter except the one named in `skip`? */
function passes(w: ClientWorker, f: DashboardFilters, skip?: keyof DashboardFilters): boolean {
  if (skip !== "position" && f.position && w.position !== f.position) return false;
  if (skip !== "site" && f.site && w.site !== f.site) return false;
  if (skip !== "contractor" && f.contractor && w.contractor !== f.contractor) return false;
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

  const scoped = workers.filter((w) => passes(w, f));
  const total = rowFor("", scoped, levels);

  const bySite = groupRows(scoped, (w) => w.site, levels).sort((a, b) =>
    collator.compare(a.name, b.name),
  );
  const allContractors = groupRows(scoped, (w) => w.contractor, levels).sort(byHeadcountThenName);
  const byContractor = allContractors.slice(0, 10);

  return {
    cells: { l0: total.l0, l1: total.l1, l2: total.l2 },
    pctSkilled: total.pctSkilled,
    pctIndependent: pctIndependent(total.l1, total.l2),
    headcount: scoped.length,
    bySite,
    byContractor,
    allContractors,
    positions: uniqSorted(workers.filter((w) => passes(w, f, "position")).map((w) => w.position)),
    sites: uniqSorted(workers.filter((w) => passes(w, f, "site")).map((w) => w.site)),
    contractors: uniqSorted(workers.filter((w) => passes(w, f, "contractor")).map((w) => w.contractor)),
  };
}
