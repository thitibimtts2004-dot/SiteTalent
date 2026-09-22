/**
 * T-006 verification — round-aware Firestore write logic.
 *
 * Exercises the REAL upsertFirestore (imported from ./import) against an in-memory
 * fake Firestore that mirrors the admin-SDK surface the function uses
 * (collection/doc/set(merge)/get/batch). No real Firestore, no network, no creds.
 *
 * Run:  tsx scripts/import.round.test.ts   (or: npm run test:round)
 * Exits non-zero if any case fails.
 */
import { upsertFirestore } from "./import";

// ---- tiny assert harness ---------------------------------------------------
let failures = 0;
function check(label: string, cond: boolean, detail = "") {
  if (cond) {
    console.log(`  ok   — ${label}`);
  } else {
    failures++;
    console.error(`  FAIL — ${label}${detail ? " :: " + detail : ""}`);
  }
}

// ---- in-memory fake Firestore (admin-SDK shaped) ---------------------------
function makeFakeDb() {
  const store = new Map<string, any>();
  const writes: string[] = [];
  function docRef(path: string): any {
    return {
      path,
      async set(data: any, opts?: { merge?: boolean }) {
        writes.push(path);
        if (opts?.merge && store.has(path)) {
          store.set(path, { ...store.get(path), ...data }); // merge preserves other fields
        } else {
          store.set(path, { ...data });
        }
      },
      async get() {
        return { exists: store.has(path), data: () => store.get(path) };
      },
      collection(name: string) {
        return collRef(path + "/" + name);
      },
    };
  }
  function collRef(path: string): any {
    return { doc(id: string) { return docRef(path + "/" + id); } };
  }
  const db: any = {
    collection(name: string) { return collRef(name); },
    batch() {
      const ops: Array<{ ref: any; data: any }> = [];
      return {
        set(ref: any, data: any) { ops.push({ ref, data }); },
        async commit() { for (const o of ops) await o.ref.set(o.data); ops.length = 0; },
      };
    },
    __store: store,
    __writes: writes,
  };
  return db;
}

// ---- minimal valid-shaped data + meta --------------------------------------
function mkData(workers: any[]) {
  return {
    overview: { total: workers.length, tag: "ov" },
    bySkill: { s01: { none: 1, lvl1: 2, lvl2: 3 } },
    bySite: [{ name: "SiteA", workers: workers.length, bySkill: {}, lvl2: 0 }],
    byContractor: [{ name: "ConX", workers: workers.length, bySkill: {}, lvl2: 0 }],
    workers,
  } as any;
}
function mkMeta(round: string) {
  return { round, date: `${round}-01`, label: `Round ${round}`, source: "test.xlsx" } as any;
}

// ===========================================================================
async function run() {
  // --- C1: first import, no previous round ---------------------------------
  {
    console.log("C1 — first import (config/app absent)");
    const db = makeFakeDb();
    const workers = [
      { code: "W001", name: "a" },
      { code: "W002", name: "b" },
      { code: "", name: "c" }, // triggers row_N fallback
    ];
    const r = "2026-01";
    await upsertFirestore(mkData(workers), mkMeta(r), "ref-1", db);
    const s = db.__store;
    check("C1 rounds/2026-01 status=current", s.get(`rounds/${r}`)?.status === "current");
    check("C1 rounds/2026-01 carries overview+label", !!s.get(`rounds/${r}`)?.overview && s.get(`rounds/${r}`)?.label === "Round 2026-01");
    check("C1 4 summary docs present",
      ["overview", "bySkill", "bySite", "byContractor"].every((d) => s.has(`rounds/${r}/summary/${d}`)),
      [...s.keys()].filter((k) => k.includes("/summary/")).join(","));
    const workerKeys = [...s.keys()].filter((k) => k.startsWith(`rounds/${r}/workers/`));
    check("C1 all workers written (count=3)", workerKeys.length === 3, `got ${workerKeys.length}`);
    check("C1 worker keyed by code W001", s.has(`rounds/${r}/workers/W001`));
    check("C1 empty-code worker -> row_N fallback", workerKeys.some((k) => /\/workers\/row_\d+$/.test(k)), workerKeys.join(","));
    check("C1 config.currentRoundId=2026-01", s.get("config/app")?.currentRoundId === r);
    check("C1 NO archive happened (only this round exists)",
      [...s.keys()].filter((k) => /^rounds\/[^/]+$/.test(k)).length === 1);
  }

  // --- C2: round switch archives the previous current round ----------------
  {
    console.log("C2 — round switch archives previous");
    const db = makeFakeDb();
    const s = db.__store;
    s.set("config/app", { currentRoundId: "2025-12" });
    s.set("rounds/2025-12", { status: "current", label: "Round 2025-12", dataDate: "2025-12-01" });
    const r = "2026-01";
    await upsertFirestore(mkData([{ code: "W001", name: "a" }]), mkMeta(r), "ref-2", db);
    check("C2 previous round flipped to archived", s.get("rounds/2025-12")?.status === "archived");
    check("C2 archive MERGED (prev label survives)", s.get("rounds/2025-12")?.label === "Round 2025-12",
      JSON.stringify(s.get("rounds/2025-12")));
    check("C2 new round status=current", s.get(`rounds/${r}`)?.status === "current");
    check("C2 config.currentRoundId=2026-01", s.get("config/app")?.currentRoundId === r);
  }

  // --- C3: re-import the SAME round does not self-archive -------------------
  {
    console.log("C3 — re-import same round (no self-archive)");
    const db = makeFakeDb();
    const s = db.__store;
    const r = "2026-01";
    s.set("config/app", { currentRoundId: r });
    s.set(`rounds/${r}`, { status: "current", label: "old" });
    await upsertFirestore(mkData([{ code: "W001", name: "a" }]), mkMeta(r), "ref-3", db);
    check("C3 round stays current (not archived itself)", s.get(`rounds/${r}`)?.status === "current",
      JSON.stringify(s.get(`rounds/${r}`)));
    check("C3 config.currentRoundId still 2026-01", s.get("config/app")?.currentRoundId === r);
  }

  // --- C4: null db -> early return, zero writes ----------------------------
  {
    console.log("C4 — db=null (fixture-only path)");
    let threw = false;
    let ret: any = "sentinel";
    try {
      ret = await upsertFirestore(mkData([{ code: "W001" }]), mkMeta("2026-01"), "ref-4", null);
    } catch (e) {
      threw = true;
    }
    check("C4 no throw on null db", !threw);
    check("C4 returns early (undefined)", ret === undefined);
  }

  // ---- verdict -------------------------------------------------------------
  console.log("");
  if (failures === 0) {
    console.log("ALL CASES PASS ✓ (C1 C2 C3 C4)");
    process.exit(0);
  } else {
    console.error(`${failures} CHECK(S) FAILED ✗`);
    process.exit(1);
  }
}

run().catch((e) => { console.error("test runner crashed:", e); process.exit(1); });
