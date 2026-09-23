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

// ── Trends (round-over-round · T-004) ───────────────────────────────────
// Compares the current round against the immediately previous one. Metrics
// mirror the rollup tables: lvl1/lvl2 are COUNTS OF CELLS (worker × skill),
// workers is the group headcount — same figures the /sites tables already show.

/** One metric across two rounds: this round, last round, and the change. */
export interface TrendPoint {
  cur: number;
  prev: number;
  /** cur − prev (positive = grew, negative = shrank). */
  delta: number;
}

/** Round-over-round change for one site or contractor group. */
export interface GroupTrend {
  name: string;
  workers: TrendPoint;
  lvl1: TrendPoint;
  lvl2: TrendPoint;
  /** present only in the current round (no previous baseline). */
  isNew?: boolean;
  /** present only in the previous round (gone this round). */
  dropped?: boolean;
}

/** Minimal round identity for the trend header. */
export interface RoundMeta {
  label: string;
  dataDate: string;
}

/** summary payload for the trend view (current vs previous round). */
export interface RoundTrend {
  /** false when there is only one round → UI degrades gracefully. */
  hasPrevious: boolean;
  current: RoundMeta;
  previous?: RoundMeta;
  bySite: GroupTrend[];
  byContractor: GroupTrend[];
}

// ── Criticality (skill-shortage flags · T-005) ──────────────────────────
// Answers user Q6. For one skill within a scope of N workers, three
// INDEPENDENT shortage flags are raised on proportions (strict `<`):
//   (lvl1+lvl2)/N < 70%  → skillShort    (เสี่ยงขาดทักษะ)
//   lvl1/N       < 50%  → operatorShort (ขาดผู้ปฏิบัติ)
//   lvl2/N       < 20%  → leaderShort   (ขาดผู้นำ/สอนงาน)

/** The three independent shortage flags for one skill in one scope. */
export interface ShortageFlags {
  skillShort: boolean;
  operatorShort: boolean;
  leaderShort: boolean;
}

/** One skill's proportions within a scope (pct in 0..1) plus its flags.
 *  none + lvl1 + lvl2 = total, so nonePct + lvl1Pct + lvl2Pct = 1. */
export interface SkillProportion {
  /** worker denominator for this scope (none+lvl1+lvl2). */
  total: number;
  none: number; // count at level 0 — ไม่มีทักษะ (one combined bucket)
  lvl1: number;
  lvl2: number;
  nonePct: number; // none/total
  proficientPct: number; // (lvl1+lvl2)/total
  lvl1Pct: number; // lvl1/total
  lvl2Pct: number; // lvl2/total
  flags: ShortageFlags;
}

/** A named site/contractor that breaches ≥1 flag for a skill. */
export interface ScopeBreach {
  name: string;
  flags: ShortageFlags;
}

/** A named site/contractor and how many of its workers are at level 0
 *  (ไม่มีทักษะ) for one skill. Lists ALL groups with none>0 — not only
 *  the flag-breaching ones — so you can see WHERE the no-skill workers are. */
export interface GroupNone {
  name: string;
  none: number; // level-0 count for this skill in this group
  workers: number; // group headcount (denominator)
}

/** Per-skill criticality for the current round (overall + breaching groups). */
export interface SkillCriticality {
  skillId: string;
  label: string;
  overall: SkillProportion;
  /** true when any overall flag is raised. */
  flagged: boolean;
  breachingSites: ScopeBreach[];
  breachingContractors: ScopeBreach[];
  /** Per-company breakdown of the level-0 (ไม่มีทักษะ) workers for this
   *  skill, groups with none>0 only, sorted desc. Answers "which company". */
  noneSites: GroupNone[];
  noneContractors: GroupNone[];
}

/** The full criticality payload for the trends/criticality view. */
export interface CriticalityReport {
  round: RoundMeta;
  skills: SkillCriticality[];
}
