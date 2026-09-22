/**
 * Read-only data access. Reads live from Firestore via the ADMIN SDK
 * (server-side, service-account credentials — bypasses security rules) when a
 * service account is configured; otherwise falls back to the local dev fixture
 * (data/normalized.json) so the UI can be built and previewed before Firebase.
 *
 * Round-aware: live reads resolve config/app.currentRoundId first, then read
 * from rounds/{roundId}/summary/* and rounds/{roundId}/workers. If no round is
 * set yet (fresh DB, or before the first round-aware import), it falls back to
 * the fixture so the dashboard still renders.
 *
 * Server-only (uses node:fs + firebase-admin) — call from Server Components /
 * route handlers. Because reads run on the server, Firestore stays locked to
 * the public and worker PII is never exposed to the browser.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "./firebaseAdmin";
import { SKILL_IDS, skillLabel } from "./skills";
import type {
  NormalizedData,
  Overview,
  BySkill,
  SkillRollup,
  GroupRollup,
  Worker,
  Round,
  RoundMeta,
  TrendPoint,
  GroupTrend,
  RoundTrend,
  ShortageFlags,
  SkillProportion,
  ScopeBreach,
  GroupNone,
  SkillCriticality,
  CriticalityReport,
} from "./types";

let fixtureCache: NormalizedData | null = null;
function fixture(): NormalizedData {
  if (!fixtureCache) {
    const p = path.join(process.cwd(), "data", "normalized.json");
    fixtureCache = JSON.parse(readFileSync(p, "utf-8")) as NormalizedData;
  }
  return fixtureCache;
}

// Non-null Firestore handle when a service account is set, else null (fixture).
const live = () => getAdminDb();

/** The round the dashboard should display, or null if none is configured. */
async function currentRoundId(db: Firestore): Promise<string | null> {
  const snap = await db.collection("config").doc("app").get();
  const id = snap.exists
    ? (snap.data() as { currentRoundId?: string }).currentRoundId
    : undefined;
  return id ?? null;
}

/** Read one summary doc from the current round, or null (→ caller uses fixture). */
async function summaryDoc<T>(name: string): Promise<T | null> {
  const db = live();
  if (!db) return null;
  const roundId = await currentRoundId(db);
  if (!roundId) return null;
  const snap = await db
    .collection("rounds").doc(roundId)
    .collection("summary").doc(name)
    .get();
  return snap.exists ? (snap.data() as T) : null;
}

export async function getOverview(): Promise<Overview> {
  return (await summaryDoc<Overview>("overview")) ?? fixture().overview;
}

export async function getBySkill(): Promise<BySkill> {
  return (await summaryDoc<BySkill>("bySkill")) ?? fixture().bySkill;
}

export async function getBySite(): Promise<GroupRollup[]> {
  const d = await summaryDoc<{ groups: GroupRollup[] }>("bySite");
  return d?.groups ?? fixture().bySite;
}

export async function getByContractor(): Promise<GroupRollup[]> {
  const d = await summaryDoc<{ groups: GroupRollup[] }>("byContractor");
  return d?.groups ?? fixture().byContractor;
}

export interface WorkerFilters {
  site?: string;
  contractor?: string;
  skillId?: string; // keep only workers who have this skill at level >= 1
  search?: string; // matches name or code
}

export async function listWorkers(
  filters: WorkerFilters = {},
): Promise<Worker[]> {
  let workers: Worker[];
  const db = live();
  const roundId = db ? await currentRoundId(db) : null;
  if (db && roundId) {
    const snap = await db
      .collection("rounds").doc(roundId)
      .collection("workers")
      .get();
    workers = snap.docs.map((d) => d.data() as Worker);
  } else {
    workers = fixture().workers;
  }

  const { site, contractor, skillId, search } = filters;
  const q = search?.trim().toLowerCase();
  return workers.filter((w) => {
    if (site && w.site !== site) return false;
    if (contractor && w.contractor !== contractor) return false;
    if (skillId && !(w.skills[skillId] >= 1)) return false;
    if (q && !w.name.toLowerCase().includes(q) && !w.code.toLowerCase().includes(q))
      return false;
    return true;
  });
}

// ── Trends (round-over-round · T-004) ─────────────────────────────────────
// getRoundTrend() compares the current round with the immediately previous one.
// The diff itself (diffRollups) is a PURE function of two rollup arrays, so it
// is unit-testable with no Firestore. getRoundTrend degrades gracefully to
// { hasPrevious:false } whenever there is no DB, no current round, or no prior
// round — so the fixture (single-round) path never throws.

/** Sum level-1 cells across a group's skills (lvl2 is stored on the group). */
function lvl1Of(g: GroupRollup): number {
  return Object.values(g.bySkill).reduce((a, s) => a + s.lvl1, 0);
}

const trendPoint = (cur: number, prev: number): TrendPoint => ({
  cur,
  prev,
  delta: cur - prev,
});

/**
 * PURE: diff current vs previous group rollups, matched by group name.
 * Groups only in `current` are marked isNew (prev=0); groups only in
 * `previous` are marked dropped (cur=0). No I/O — trivially testable.
 */
export function diffRollups(
  current: GroupRollup[],
  previous: GroupRollup[],
): GroupTrend[] {
  const prevByName = new Map(previous.map((g) => [g.name, g]));
  const seen = new Set<string>();

  const out: GroupTrend[] = current.map((c) => {
    seen.add(c.name);
    const p = prevByName.get(c.name);
    return {
      name: c.name,
      workers: trendPoint(c.workers, p?.workers ?? 0),
      lvl1: trendPoint(lvl1Of(c), p ? lvl1Of(p) : 0),
      lvl2: trendPoint(c.lvl2, p?.lvl2 ?? 0),
      ...(p ? {} : { isNew: true }),
    };
  });

  for (const p of previous) {
    if (seen.has(p.name)) continue;
    out.push({
      name: p.name,
      workers: trendPoint(0, p.workers),
      lvl1: trendPoint(0, lvl1Of(p)),
      lvl2: trendPoint(0, p.lvl2),
      dropped: true,
    });
  }
  return out;
}

/**
 * The archived round with the latest dataDate (≠ the current round), or null.
 * Tie-break deterministically by roundId desc when dataDates are equal.
 */
async function previousRoundId(
  db: Firestore,
  currentId: string | null,
): Promise<string | null> {
  const snap = await db
    .collection("rounds")
    .where("status", "==", "archived")
    .get();
  const rounds = snap.docs
    .map((d) => ({ id: d.id, dataDate: (d.data() as Round).dataDate ?? "" }))
    .filter((r) => r.id !== currentId)
    .sort((a, b) =>
      a.dataDate === b.dataDate
        ? b.id.localeCompare(a.id)
        : b.dataDate.localeCompare(a.dataDate),
    );
  return rounds.length ? rounds[0].id : null;
}

/** Read one round's group rollup (bySite | byContractor), or [] if absent. */
async function summaryGroupsFor(
  db: Firestore,
  roundId: string,
  name: "bySite" | "byContractor",
): Promise<GroupRollup[]> {
  const snap = await db
    .collection("rounds").doc(roundId)
    .collection("summary").doc(name)
    .get();
  return snap.exists
    ? ((snap.data() as { groups?: GroupRollup[] }).groups ?? [])
    : [];
}

/** Read a round's label + dataDate for the trend header. */
async function roundMeta(db: Firestore, roundId: string): Promise<RoundMeta> {
  const snap = await db.collection("rounds").doc(roundId).get();
  const r = snap.exists ? (snap.data() as Round) : null;
  return { label: r?.label ?? roundId, dataDate: r?.dataDate ?? "" };
}

/**
 * Current vs previous round, grouped by site and by contractor. Degrades to
 * { hasPrevious:false, empty arrays } when there is no DB / no current / no
 * previous round (the single-round and fixture cases). `db` is injectable for
 * testing (defaults to the live admin handle).
 */
export async function getRoundTrend(
  db: Firestore | null = live(),
): Promise<RoundTrend> {
  const noPrev = (current: RoundMeta): RoundTrend => ({
    hasPrevious: false,
    current,
    bySite: [],
    byContractor: [],
  });

  if (!db) return noPrev({ label: "รอบปัจจุบัน", dataDate: "" });
  const curId = await currentRoundId(db);
  if (!curId) return noPrev({ label: "รอบปัจจุบัน", dataDate: "" });

  const cur = await roundMeta(db, curId);
  const prevId = await previousRoundId(db, curId);
  if (!prevId) return noPrev(cur);
  const prev = await roundMeta(db, prevId);

  const [curSite, prevSite, curCon, prevCon] = await Promise.all([
    summaryGroupsFor(db, curId, "bySite"),
    summaryGroupsFor(db, prevId, "bySite"),
    summaryGroupsFor(db, curId, "byContractor"),
    summaryGroupsFor(db, prevId, "byContractor"),
  ]);

  return {
    hasPrevious: true,
    current: cur,
    previous: prev,
    bySite: diffRollups(curSite, prevSite),
    byContractor: diffRollups(curCon, prevCon),
  };
}

// ── Criticality (skill-shortage flags · T-005) ─────────────────────────────
// flagSkill + buildCriticality are PURE (no Firestore) → unit-testable. The
// rule is proportion-based with a STRICT `<` (exactly at a threshold = NOT a
// shortage). A denominator of 0 raises no flag (guarded — no divide-by-zero).
// getCriticality composes the existing round-aware/fixture-degrading accessors.

const SKILL_SHORT_MAX = 0.7; // proficient (lvl1+lvl2) share below → เสี่ยงขาดทักษะ
const OPERATOR_SHORT_MAX = 0.5; // lvl1 share below → ขาดผู้ปฏิบัติ
const LEADER_SHORT_MAX = 0.2; // lvl2 share below → ขาดผู้นำ/สอนงาน

/** PURE: the three independent shortage flags for one skill vs a scope total. */
export function flagSkill(counts: SkillRollup, total: number): ShortageFlags {
  if (total <= 0) {
    return { skillShort: false, operatorShort: false, leaderShort: false };
  }
  return {
    skillShort: (counts.lvl1 + counts.lvl2) / total < SKILL_SHORT_MAX,
    operatorShort: counts.lvl1 / total < OPERATOR_SHORT_MAX,
    leaderShort: counts.lvl2 / total < LEADER_SHORT_MAX,
  };
}

/** True when any of the three flags is raised. */
const anyFlag = (f: ShortageFlags): boolean =>
  f.skillShort || f.operatorShort || f.leaderShort;

const EMPTY_ROLLUP: SkillRollup = { none: 0, lvl1: 0, lvl2: 0 };

/** Proportions (0..1) + flags for one skill in a scope. total=0 → 0 pcts. */
function proportionFor(counts: SkillRollup, total: number): SkillProportion {
  const denom = total > 0 ? total : 1; // flags already guard total<=0
  return {
    total,
    none: counts.none,
    lvl1: counts.lvl1,
    lvl2: counts.lvl2,
    nonePct: counts.none / denom,
    proficientPct: (counts.lvl1 + counts.lvl2) / denom,
    lvl1Pct: counts.lvl1 / denom,
    lvl2Pct: counts.lvl2 / denom,
    flags: flagSkill(counts, total),
  };
}

/**
 * PURE: per-skill criticality for one round. For each of the 17 skills, compute
 * the overall proportion (vs the scope's worker total) and list the site /
 * contractor groups that breach ≥1 flag (each group scored against its own
 * headcount). A skill absent from a rollup counts as 0/0/0 — intentionally a
 * shortage (nobody can do it).
 */
export function buildCriticality(
  overallTotal: number,
  overallBySkill: BySkill,
  sites: GroupRollup[],
  contractors: GroupRollup[],
): SkillCriticality[] {
  const breachesIn = (groups: GroupRollup[], skillId: string): ScopeBreach[] =>
    groups
      .map((g) => ({
        name: g.name,
        flags: flagSkill(g.bySkill[skillId] ?? EMPTY_ROLLUP, g.workers),
      }))
      .filter((b) => anyFlag(b.flags));

  // Every group with ≥1 level-0 worker for this skill, biggest gap first —
  // so the UI can show WHERE the no-skill workers are (not only breachers).
  const noneIn = (groups: GroupRollup[], skillId: string): GroupNone[] =>
    groups
      .map((g) => ({
        name: g.name,
        none: (g.bySkill[skillId] ?? EMPTY_ROLLUP).none,
        workers: g.workers,
      }))
      .filter((x) => x.none > 0)
      .sort((a, b) => b.none - a.none);

  return SKILL_IDS.map((skillId) => {
    const overall = proportionFor(
      overallBySkill[skillId] ?? EMPTY_ROLLUP,
      overallTotal,
    );
    return {
      skillId,
      label: skillLabel(skillId),
      overall,
      flagged: anyFlag(overall.flags),
      breachingSites: breachesIn(sites, skillId),
      breachingContractors: breachesIn(contractors, skillId),
      noneSites: noneIn(sites, skillId),
      noneContractors: noneIn(contractors, skillId),
    };
  });
}

/** The current round's label + dataDate, or a neutral default (no db/round). */
async function currentRoundMeta(db: Firestore | null): Promise<RoundMeta> {
  if (!db) return { label: "รอบปัจจุบัน", dataDate: "" };
  const id = await currentRoundId(db);
  if (!id) return { label: "รอบปัจจุบัน", dataDate: "" };
  return roundMeta(db, id);
}

/**
 * Per-skill criticality for the current round. Composes the existing accessors
 * (each round-aware + fixture-degrading), so it works before Firestore is set.
 * `db` is injectable for the round header; the rollup reads self-resolve live.
 */
export async function getCriticality(
  db: Firestore | null = live(),
): Promise<CriticalityReport> {
  const [overview, bySkill, sites, contractors, round] = await Promise.all([
    getOverview(),
    getBySkill(),
    getBySite(),
    getByContractor(),
    currentRoundMeta(db),
  ]);
  return {
    round,
    skills: buildCriticality(overview.workers, bySkill, sites, contractors),
  };
}
