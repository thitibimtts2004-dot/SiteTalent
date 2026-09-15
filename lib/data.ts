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
import type {
  NormalizedData,
  Overview,
  BySkill,
  GroupRollup,
  Worker,
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
