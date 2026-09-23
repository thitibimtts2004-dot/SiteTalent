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

/** The slim, browser-safe shape sent to the client. For this INTERNAL tool the
 *  user accepted worker code+name reaching the browser (drill-down search table);
 *  the per-skill map + assessor/date are dropped. */
export interface ClientWorker {
  code: string;
  name: string;
  site: string;
  contractor: string;
  position: string;
  l0: number; // skills at level 0 (ทำไม่ได้/ไม่ได้บันทึก)
  l1: number; // skills at level 1 (ทำได้บางส่วน)
  l2: number; // skills at level 2 (ทำได้ผ่านมาตรฐาน)
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
  positions: string[]; // every position in the input, sorted — stable filter options
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
function rowFor(name: string, ws: ClientWorker[]): GroupRow {
  let l0 = 0;
  let l1 = 0;
  let l2 = 0;
  for (const w of ws) {
    l0 += w.l0;
    l1 += w.l1;
    l2 += w.l2;
  }
  return { name, headcount: ws.length, l0, l1, l2, pctSkilled: pctSkilled(l0, l1, l2) };
}

/** Group workers by a key, returning one GroupRow per distinct value. */
function groupRows(ws: ClientWorker[], key: (w: ClientWorker) => string): GroupRow[] {
  const buckets = new Map<string, ClientWorker[]>();
  for (const w of ws) {
    const k = key(w);
    const b = buckets.get(k);
    if (b) b.push(w);
    else buckets.set(k, [w]);
  }
  return [...buckets.entries()].map(([name, group]) => rowFor(name, group));
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

/**
 * Aggregate the worker list into everything the dashboard renders.
 * When `position` is given, only workers in that position feed the numbers —
 * but `positions[]` is always derived from the FULL input so the filter options
 * never change as you filter.
 */
export function aggregate(workers: ClientWorker[], position?: string): DashboardData {
  const positions = [...new Set(workers.map((w) => w.position))].sort(collator.compare);

  const scoped =
    position && position.length > 0 ? workers.filter((w) => w.position === position) : workers;

  let l0 = 0;
  let l1 = 0;
  let l2 = 0;
  for (const w of scoped) {
    l0 += w.l0;
    l1 += w.l1;
    l2 += w.l2;
  }

  const bySite = groupRows(scoped, (w) => w.site).sort((a, b) => collator.compare(a.name, b.name));
  const allContractors = groupRows(scoped, (w) => w.contractor).sort(byHeadcountThenName);
  const byContractor = allContractors.slice(0, 10);

  return {
    cells: { l0, l1, l2 },
    pctSkilled: pctSkilled(l0, l1, l2),
    pctIndependent: pctIndependent(l1, l2),
    headcount: scoped.length,
    bySite,
    byContractor,
    allContractors,
    positions,
  };
}
