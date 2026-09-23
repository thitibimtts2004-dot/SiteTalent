/**
 * Import pipeline: master xlsx -> normalized bundle -> data/normalized.json
 * (dev fixture, always) + Firestore upsert (when a service account is set).
 *
 * Round-aware: every import writes ONE round (a snapshot). Data lands under
 *   rounds/{roundId}/workers/{code} and rounds/{roundId}/summary/{doc}
 * and config/app.currentRoundId is pointed at it so the dashboard shows it.
 * The previous current round (if any) is flipped to status "archived".
 *
 * Run:  npm run import                         (round = this month, date = today)
 *       npm run import -- --round=2026-09 --date=2026-09-01 --label="รอบ ก.ย."
 *       npm run import -- --source=external_sync
 *
 * Scoring rule (verified in gather): read the BASE column only; the two flag
 * columns are redundant. Every total is recomputed from the 17 base cols —
 * the in-file total columns are NOT trusted.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd()); // load .env + .env.local (same as Next) before any env read
import * as XLSX from "xlsx";
import { writeFileSync, readdirSync } from "node:fs";
import { SKILLS, SKILL_IDS } from "../lib/skills";
import {
  SHEET_NAME,
  FIRST_DATA_ROW,
  META_COLS,
  SKILL_BASE_COLS,
} from "../lib/xlsxMap";
import type {
  Worker,
  SkillLevel,
  NormalizedData,
  SkillRollup,
  GroupRollup,
  BySkill,
  Overview,
  RoundSource,
} from "../lib/types";
import { getAdminDb } from "../lib/firebaseAdmin";
import { snapshotChunks } from "../lib/workerSnapshot";

const DATA_DIR = "data";
const OUT = `${DATA_DIR}/normalized.json`;

/** One import = one round. Meta describes that round. */
interface RoundMeta {
  round: string; // roundId, e.g. "2026-09"
  date: string; // dataDate (assessment date), "YYYY-MM-DD"
  label: string;
  source: RoundSource;
}

/** Read --key=value flags from argv (everything after `--` in the npm script). */
function parseArgs(): RoundMeta {
  const args = process.argv.slice(2);
  const get = (k: string): string | undefined => {
    const p = args.find((a) => a.startsWith(`--${k}=`));
    return p ? p.slice(k.length + 3) : undefined;
  };
  const date = get("date") || new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const round = get("round") || date.slice(0, 7); // YYYY-MM (monthly)
  const label = get("label") || `รอบ ${round}`;
  const src = get("source");
  const source: RoundSource = src === "external_sync" ? "external_sync" : "hr_excel";
  if (src && src !== "external_sync" && src !== "hr_excel") {
    console.warn(`  ! unknown --source=${src}, defaulting to hr_excel`);
  }
  return { round, date, label, source };
}

function findWorkbook(): string {
  const f = readdirSync(DATA_DIR).find(
    (n) => n.endsWith(".xlsx") && !n.startsWith("~$"),
  );
  if (!f) throw new Error("No .xlsx found in data/");
  return `${DATA_DIR}/${f}`;
}

function toLevel(v: unknown): SkillLevel {
  const n = typeof v === "number" ? v : parseInt(String(v ?? "0"), 10);
  return n === 2 ? 2 : n === 1 ? 1 : 0;
}

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
function fmtDate(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  return String(v).trim();
}

function build(): {
  data: NormalizedData;
  domainViolations: number;
  sourceRef: string;
} {
  const wbPath = findWorkbook();
  const wb = XLSX.readFile(wbPath);
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Sheet ${SHEET_NAME} not found`);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    blankrows: false,
    defval: null,
  });

  const workers: Worker[] = [];
  let domainViolations = 0; // any base cell outside {0,1,2} -> wrong column read

  for (let i = FIRST_DATA_ROW; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const seq = row[META_COLS.seq];
    if (seq == null || String(seq).trim() === "" || isNaN(Number(seq))) continue;

    const skills: Record<string, SkillLevel> = {};
    let none = 0, lvl1 = 0, lvl2 = 0, score = 0;
    SKILL_BASE_COLS.forEach((col, idx) => {
      const raw = row[col];
      const rawNum = typeof raw === "number" ? raw : parseInt(String(raw ?? "0"), 10);
      if (![0, 1, 2].includes(rawNum)) domainViolations++;
      const lvl = toLevel(raw);
      skills[SKILLS[idx].id] = lvl;
      score += lvl;
      if (lvl === 2) lvl2++;
      else if (lvl === 1) lvl1++;
      else none++;
    });

    workers.push({
      code: String(row[META_COLS.code] ?? "").trim(),
      name: String(row[META_COLS.name] ?? "").trim(),
      site: String(row[META_COLS.site] ?? "").trim(),
      contractor: String(row[META_COLS.contractor] ?? "").trim(),
      position: String(row[META_COLS.position] ?? "").trim(),
      assessedDate: fmtDate(row[META_COLS.assessedDate]),
      assessor: String(row[META_COLS.assessor] ?? "").trim(),
      skills,
      totals: { none, lvl1, lvl2, total: lvl1 + lvl2, score },
    });
  }

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
  const overview: Overview = {
    workers: workers.length,
    sites: siteMap.size,
    contractors: conMap.size,
    overallLvl2Pct: totalCells ? +((lvl2Cells / totalCells) * 100).toFixed(1) : 0,
  };

  const data: NormalizedData = {
    overview,
    bySkill,
    bySite: [...siteMap.values()].sort((a, b) => b.workers - a.workers),
    byContractor: [...conMap.values()].sort((a, b) => b.workers - a.workers),
    workers,
  };
  return { data, domainViolations, sourceRef: wbPath.split("/").pop() ?? wbPath };
}

function report(data: NormalizedData, domainViolations: number): boolean {
  const { overview, bySite, bySkill } = data;
  let ok = true;
  const fail = (m: string) => { ok = false; console.log("  ✗ " + m); };
  const pass = (m: string) => console.log("  ✓ " + m);

  console.log("\n=== Validation report ===");
  console.log(`workers=${overview.workers} sites=${overview.sites} contractors=${overview.contractors} overallLvl2=${overview.overallLvl2Pct}%`);

  // 1) exact worker count (finding #2)
  overview.workers === 1531
    ? pass("worker count = 1531")
    : fail(`worker count = ${overview.workers} (expected 1531)`);

  // 2) decode sanity — no base cell outside {0,1,2} (finding #4)
  domainViolations === 0
    ? pass("all skill cells in {0,1,2} (base-col decode ok)")
    : fail(`${domainViolations} cells outside {0,1,2} — wrong column?`);

  // 3) per-site reconciliation vs known-good gather counts (finding #3)
  const EXPECT: Record<string, number> = {
    "Valles Haus": 674, "Escent Hatyai 2": 381, "Escent Nakhon Si": 204,
    "Renovation of UFM Building": 103, "Live Ramintra": 95, "CBH SKV12": 74,
  };
  console.log("  sites:");
  for (const s of bySite) {
    const exp = Object.entries(EXPECT).find(([n]) => s.name.includes(n) || n.includes(s.name));
    const tag = exp ? (exp[1] === s.workers ? "✓" : `✗ expected ${exp[1]}`) : "· (unlisted)";
    if (exp && exp[1] !== s.workers) ok = false;
    console.log(`    ${tag}  ${s.name} = ${s.workers}`);
  }

  // 4) anchor cross-check: the 381-worker site, งานปูน (s01) = 239/53/89
  const anchor = bySite.find((s) => s.workers === 381);
  if (anchor) {
    const r = anchor.bySkill["s01"];
    r.none === 239 && r.lvl1 === 53 && r.lvl2 === 89
      ? pass(`anchor ${anchor.name} งานปูน = ${r.none}/${r.lvl1}/${r.lvl2}`)
      : fail(`anchor งานปูน = ${r.none}/${r.lvl1}/${r.lvl2} (expected 239/53/89)`);
  } else fail("no 381-worker site found for anchor check");

  console.log("  ระดับ2 per skill:");
  for (const sk of SKILLS) console.log(`    ${sk.label}: ${bySkill[sk.id].lvl2}`);

  return ok;
}

export async function upsertFirestore(
  data: NormalizedData,
  meta: RoundMeta,
  sourceRef: string,
  db: ReturnType<typeof getAdminDb> = getAdminDb(),
) {
  if (!db) {
    console.log("\nFirestore: skipped (no FIREBASE_SERVICE_ACCOUNT_PATH) — fixture only.");
    return;
  }
  const { round, date, label, source } = meta;
  console.log(`\nFirestore: upserting round ${round}...`);
  const roundRef = db.collection("rounds").doc(round);

  // round metadata (overview snapshot lets us list rounds cheaply)
  await roundRef.set(
    {
      label,
      dataDate: date,
      source,
      sourceRef,
      importedAt: new Date(), // admin SDK stores a JS Date as a Firestore Timestamp
      overview: data.overview,
      status: "current",
    },
    { merge: true },
  );

  // summary docs, now scoped under the round
  await roundRef.collection("summary").doc("overview").set(data.overview);
  await roundRef.collection("summary").doc("bySkill").set(data.bySkill);
  await roundRef.collection("summary").doc("bySite").set({ groups: data.bySite });
  await roundRef.collection("summary").doc("byContractor").set({ groups: data.byContractor });

  // workers, scoped under the round
  let batch = db.batch(), n = 0, written = 0;
  for (const w of data.workers) {
    batch.set(roundRef.collection("workers").doc(w.code || `row_${written}`), w);
    if (++n === 450) { await batch.commit(); batch = db.batch(); n = 0; }
    written++;
  }
  if (n) await batch.commit();

  // worker SNAPSHOT: the whole list in a few docs so the dashboard reads ~4 docs
  // instead of ~1.5k on a cold cache (serverless instances start cold often).
  // Stored as a JSON string so Firestore does not index every nested field.
  const chunks = snapshotChunks(data.workers);
  for (let i = 0; i < chunks.length; i++) {
    await roundRef.collection("snapshot").doc(`workers_${i}`).set({ json: chunks[i] });
  }
  // readers trust workerChunks, so stale workers_N docs from a bigger past import are ignored
  await roundRef.set({ workerChunks: chunks.length }, { merge: true });

  // flip the previous current round to archived, then point config at this one
  const cfgSnap = await db.collection("config").doc("app").get();
  const prev = cfgSnap.exists
    ? (cfgSnap.data() as { currentRoundId?: string }).currentRoundId
    : undefined;
  if (prev && prev !== round) {
    await db.collection("rounds").doc(prev).set({ status: "archived" }, { merge: true });
    console.log(`Firestore: archived previous round ${prev}.`);
  }
  // dataVersion changes on every import → busts the dashboard read cache (lib/dataCache.ts)
  await db
    .collection("config").doc("app")
    .set({ currentRoundId: round, dataVersion: new Date().toISOString() }, { merge: true });

  console.log(`Firestore: wrote round ${round} — ${written} workers + 4 summary docs; currentRoundId=${round}.`);
}

async function main() {
  const meta = parseArgs();
  const { data, domainViolations, sourceRef } = build();
  writeFileSync(OUT, JSON.stringify(data, null, 2), "utf-8");
  console.log(`Wrote ${OUT} (${data.workers.length} workers) · round=${meta.round} date=${meta.date} source=${meta.source}`);
  const ok = report(data, domainViolations);
  await upsertFirestore(data, meta, sourceRef).catch((e) => console.error("Firestore upsert failed:", e.message));
  if (!ok) { console.error("\nVALIDATION FAILED"); process.exit(1); }
  console.log("\nVALIDATION PASSED");
}

// Run only when executed directly (`tsx scripts/import.ts` / `npm run import`),
// NOT when imported by a test — otherwise importing upsertFirestore would run main().
if (/[\\/]import\.ts$/.test(process.argv[1] || "")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
