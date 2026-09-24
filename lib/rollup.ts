/**
 * Pure rollup math: a worker list -> overview / bySkill / bySite / byContractor.
 *
 * Same formula as scripts/import.ts build(), so a scoped view (a subset of
 * workers) is computed exactly like the precomputed summary docs. Parity with
 * the import output is guarded by lib/rollup.test.ts (deep-equal vs the fixture).
 */
import { SKILL_IDS } from "./skills";
import type {
  Worker,
  SkillLevel,
  SkillRollup,
  GroupRollup,
  BySkill,
  NormalizedData,
} from "./types";

export type Rollups = Pick<
  NormalizedData,
  "overview" | "bySkill" | "bySite" | "byContractor"
>;

const emptyRollup = (): SkillRollup => ({ none: 0, lvl1: 0, lvl2: 0 });
function addLevel(r: SkillRollup, lvl: SkillLevel) {
  if (lvl === 2) r.lvl2++;
  else if (lvl === 1) r.lvl1++;
  else r.none++;
}
function newGroup(name: string): GroupRollup {
  return {
    name,
    workers: 0,
    bySkill: Object.fromEntries(SKILL_IDS.map((id) => [id, emptyRollup()])),
    lvl2: 0,
  };
}

export function rollupWorkers(workers: Worker[]): Rollups {
  const bySkill: BySkill = Object.fromEntries(
    SKILL_IDS.map((id) => [id, emptyRollup()]),
  );
  const siteMap = new Map<string, GroupRollup>();
  const conMap = new Map<string, GroupRollup>();
  const ensure = (m: Map<string, GroupRollup>, k: string) =>
    m.get(k) ?? (m.set(k, newGroup(k)), m.get(k)!);

  let lvl2Cells = 0;
  for (const w of workers) {
    const site = ensure(siteMap, w.site);
    const con = ensure(conMap, w.contractor);
    site.workers++;
    con.workers++;
    for (const id of SKILL_IDS) {
      const lvl = w.skills[id];
      addLevel(bySkill[id], lvl);
      addLevel(site.bySkill[id], lvl);
      addLevel(con.bySkill[id], lvl);
      if (lvl === 2) { lvl2Cells++; site.lvl2++; con.lvl2++; }
    }
  }

  const totalCells = workers.length * SKILL_IDS.length;
  return {
    overview: {
      workers: workers.length,
      sites: siteMap.size,
      contractors: conMap.size,
      overallLvl2Pct: totalCells ? +((lvl2Cells / totalCells) * 100).toFixed(1) : 0,
    },
    bySkill,
    bySite: [...siteMap.values()].sort((a, b) => b.workers - a.workers),
    byContractor: [...conMap.values()].sort((a, b) => b.workers - a.workers),
  };
}
