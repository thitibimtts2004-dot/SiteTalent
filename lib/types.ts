/** Skill proficiency: 0 = ทำไม่ได้, 1 = ทำได้บางส่วน, 2 = ทำได้ผ่านมาตรฐาน. */
export type SkillLevel = 0 | 1 | 2;

/** Per-worker totals — ALWAYS recomputed from the 17 base scores, never read
 *  from the (unreliable) in-file total columns. */
export interface WorkerTotals {
  none: number; // count of skills at level 0
  lvl1: number; // count at level 1
  lvl2: number; // count at level 2
  total: number; // skills with any level (lvl1 + lvl2)
  score: number; // sum of all 17 levels (0..34)
}

export interface Worker {
  code: string;
  name: string;
  site: string;
  contractor: string;
  position: string;
  assessedDate: string;
  assessor: string;
  /** skillId ("s01".."s17") -> level */
  skills: Record<string, SkillLevel>;
  totals: WorkerTotals;
}

/** Count of people at each level for one skill (used in every rollup). */
export interface SkillRollup {
  none: number;
  lvl1: number;
  lvl2: number;
}

/** summary/overview */
export interface Overview {
  workers: number;
  sites: number;
  contractors: number;
  /** % of all (worker x skill) cells at level 2 — the headline metric. */
  overallLvl2Pct: number;
}

/** summary/bySkill : skillId -> rollup */
export type BySkill = Record<string, SkillRollup>;

/** One row of a site or contractor rollup. */
export interface GroupRollup {
  name: string;
  workers: number;
  /** skillId -> rollup within this group */
  bySkill: BySkill;
  /** count of level-2 cells across all skills in this group */
  lvl2: number;
}

/** The full normalized bundle produced by the import pipeline. */
export interface NormalizedData {
  overview: Overview;
  bySkill: BySkill;
  bySite: GroupRollup[];
  byContractor: GroupRollup[];
  workers: Worker[];
}

// ── Rounds (data snapshots) ─────────────────────────────────────────────
// Each import = one round. `config/app.currentRoundId` points to the live one.
// Workers + summaries live UNDER rounds/{roundId}/… so history is preserved.

/** Where a round's data came from. */
export type RoundSource = "hr_excel" | "external_sync";

/** current = the round the dashboard shows · archived = kept for history. */
export type RoundStatus = "current" | "archived";

/** rounds/{roundId} — one snapshot of assessment data. */
export interface Round {
  /** human label, e.g. "รอบ 2026-09". */
  label: string;
  /** the DATE OF THE DATA (assessment date), "YYYY-MM-DD". */
  dataDate: string;
  source: RoundSource;
  /** Excel filename or external-sync id this round was built from. */
  sourceRef: string;
  /** when it was imported into the system (distinct from dataDate). */
  importedAt: unknown; // stored as a Firestore Timestamp
  /** quick snapshot for listing rounds without reading the summary docs. */
  overview: Overview;
  status: RoundStatus;
}
