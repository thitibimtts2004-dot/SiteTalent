/**
 * Runnable unit test for the round-over-round trend logic (T-004).
 * Exercises the REAL exported functions from ./data:
 *   - diffRollups()  : pure, no I/O
 *   - getRoundTrend(): via an in-memory fake Firestore (no real credentials)
 *
 * Run:  npm run test:trend   (needs Node 20 — see package.json)
 * No test runner is installed; this is a plain tsx script with a tiny assert
 * harness. Exit code 0 = all pass, 1 = at least one failure.
 */
import { diffRollups, getRoundTrend } from "./data";
import type { GroupRollup } from "./types";

// ── tiny assert harness ────────────────────────────────────────────────
let failures = 0;
function check(name: string, cond: boolean): void {
  if (cond) console.log("  ✓", name);
  else {
    failures++;
    console.error("  ✗", name);
  }
}
function eq(name: string, got: unknown, want: unknown): void {
  check(`${name} (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`, got === want);
}

// ── fixtures ────────────────────────────────────────────────────────────
/** Build a GroupRollup whose summed level-1 cells = `lvl1` and lvl2 = `lvl2`. */
function g(name: string, workers: number, lvl1: number, lvl2: number): GroupRollup {
  return { name, workers, lvl2, bySkill: { s01: { none: 0, lvl1, lvl2 } } };
}

// ── in-memory fake Firestore ──────────────────────────────────────────────
// Supports exactly the calls lib/data.ts makes:
//   collection("config").doc(id).get()
//   collection("rounds").where("status","==",v).get() -> {docs:[{id,data()}]}
//   collection("rounds").doc(id).get()
//   collection("rounds").doc(id).collection("summary").doc(name).get()
type Data = Record<string, unknown> | undefined;
function snap(id: string, data: Data) {
  return { exists: data !== undefined, id, data: () => data };
}
interface RoundStore {
  meta?: Record<string, unknown>;
  summary?: Record<string, Data>;
}
interface Store {
  config?: Record<string, Data>;
  rounds?: Record<string, RoundStore>;
}
function fakeDb(store: Store) {
  return {
    collection(coll: string) {
      if (coll === "config") {
        return { doc: (id: string) => ({ get: async () => snap(id, store.config?.[id]) }) };
      }
      if (coll === "rounds") {
        return {
          where(field: string, _op: string, val: unknown) {
            return {
              get: async () => ({
                docs: Object.entries(store.rounds ?? {})
                  .filter(([, r]) => r.meta?.[field] === val)
                  .map(([id, r]) => snap(id, r.meta)),
              }),
            };
          },
          doc(id: string) {
            const r = store.rounds?.[id];
            return {
              get: async () => snap(id, r?.meta),
              collection(_sub: string) {
                return { doc: (name: string) => ({ get: async () => snap(name, r?.summary?.[name]) }) };
              },
            };
          },
        };
      }
      return { doc: () => ({ get: async () => snap("", undefined) }) };
    },
  };
}

// ── C1: normal delta (increase and decrease) ─────────────────────────────
console.log("C1 diffRollups — increase & decrease");
{
  const cur = [g("A", 10, 5, 3), g("B", 5, 2, 1)];
  const prev = [g("A", 8, 4, 1), g("B", 7, 3, 2)];
  const out = diffRollups(cur, prev);
  const A = out.find((x) => x.name === "A")!;
  const B = out.find((x) => x.name === "B")!;
  eq("A.workers.delta", A.workers.delta, 2);
  eq("A.lvl1.delta", A.lvl1.delta, 1);
  eq("A.lvl2.delta", A.lvl2.delta, 2);
  eq("A.lvl2.cur", A.lvl2.cur, 3);
  eq("A.lvl2.prev", A.lvl2.prev, 1);
  eq("B.workers.delta", B.workers.delta, -2);
  eq("B.lvl1.delta", B.lvl1.delta, -1);
  eq("B.lvl2.delta", B.lvl2.delta, -1);
  check("A not flagged isNew/dropped", !A.isNew && !A.dropped);
}

// ── C2: group only in current -> isNew ───────────────────────────────────
console.log("C2 diffRollups — new group");
{
  const out = diffRollups([g("C", 4, 2, 1)], []);
  const C = out.find((x) => x.name === "C")!;
  check("C.isNew", C.isNew === true);
  eq("C.workers.prev", C.workers.prev, 0);
  eq("C.workers.delta", C.workers.delta, 4);
  eq("C.lvl1.prev", C.lvl1.prev, 0);
}

// ── C3: group only in previous -> dropped ────────────────────────────────
console.log("C3 diffRollups — dropped group");
{
  const out = diffRollups([], [g("D", 6, 3, 2)]);
  const D = out.find((x) => x.name === "D")!;
  check("D.dropped", D.dropped === true);
  eq("D.workers.cur", D.workers.cur, 0);
  eq("D.workers.delta", D.workers.delta, -6);
  eq("D.lvl2.cur", D.lvl2.cur, 0);
}

// async cases + result — wrapped in an async IIFE because tsx emits CJS,
// which does not allow top-level await.
void (async () => {
// ── C4: getRoundTrend with two rounds (fake db) ──────────────────────────
console.log("C4 getRoundTrend — two rounds");
{
  const db = fakeDb({
    config: { app: { currentRoundId: "r2" } },
    rounds: {
      r1: {
        meta: { label: "รอบ1", dataDate: "2026-08-01", status: "archived" },
        summary: {
          bySite: { groups: [g("Site1", 8, 4, 1)] },
          byContractor: { groups: [g("ConA", 7, 3, 2)] },
        },
      },
      r2: {
        meta: { label: "รอบ2", dataDate: "2026-09-01", status: "current" },
        summary: {
          bySite: { groups: [g("Site1", 10, 5, 3)] },
          byContractor: { groups: [g("ConA", 10, 5, 3)] },
        },
      },
    },
  });
  const t = await getRoundTrend(db as never);
  check("hasPrevious", t.hasPrevious === true);
  eq("current.label", t.current.label, "รอบ2");
  eq("previous.label", t.previous?.label, "รอบ1");
  const s1 = t.bySite.find((x) => x.name === "Site1")!;
  eq("Site1.workers.delta", s1.workers.delta, 2);
  eq("Site1.lvl1.delta", s1.lvl1.delta, 1);
  eq("Site1.lvl2.delta", s1.lvl2.delta, 2);
  const c1 = t.byContractor.find((x) => x.name === "ConA")!;
  eq("ConA.lvl2.delta", c1.lvl2.delta, 1);
}

// ── C5: getRoundTrend single round (no archived) -> degrade ──────────────
console.log("C5 getRoundTrend — single round degrades");
{
  const db = fakeDb({
    config: { app: { currentRoundId: "r2" } },
    rounds: {
      r2: {
        meta: { label: "รอบ2", dataDate: "2026-09-01", status: "current" },
        summary: { bySite: { groups: [g("Site1", 10, 5, 3)] } },
      },
    },
  });
  const t = await getRoundTrend(db as never);
  check("hasPrevious=false", t.hasPrevious === false);
  eq("bySite empty", t.bySite.length, 0);
  eq("byContractor empty", t.byContractor.length, 0);
}

// ── C6: getRoundTrend(null) -> no throw, degrade ─────────────────────────
console.log("C6 getRoundTrend(null) — no db");
{
  const t = await getRoundTrend(null);
  check("hasPrevious=false", t.hasPrevious === false);
  eq("bySite empty", t.bySite.length, 0);
}

// ── result ────────────────────────────────────────────────────────────────
if (failures) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
} else {
  console.log("\nAll trend checks passed");
  process.exit(0);
}
})();
