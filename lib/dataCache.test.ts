/**
 * Read-cache + worker-snapshot tests (no real Firestore).
 * Run: npm run test:cache
 *
 * Uses a read-counting in-memory fake Firestore to prove the two cost claims:
 *   - a warm cache costs 0 reads per render
 *   - a cold cache reads the worker SNAPSHOT (a few docs), not one doc per worker
 */
import { cached, staleSince } from "./dataCache";
import { getRoundTrend, listWorkers } from "./data";
import { snapshotChunks, workersFromChunks } from "./workerSnapshot";
import type { Worker } from "./types";

let fails = 0;
const check = (name: string, ok: boolean) => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}`);
  if (!ok) fails++;
};
const mem = { ttlMs: Infinity, persist: false };
const short = { ttlMs: 1, persist: false };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Minimal Firestore fake over a path→data map; counts every billed document read. */
function fakeDb(docs: Record<string, any>) {
  const counter = { reads: 0 };
  const doc = (p: string): any => ({
    get: async () => {
      counter.reads++;
      return { exists: p in docs, data: () => docs[p] };
    },
    collection: (c: string) => col(`${p}/${c}`),
  });
  const children = (p: string) =>
    Object.keys(docs).filter((k) => k.startsWith(p + "/") && !k.slice(p.length + 1).includes("/"));
  const col = (p: string): any => ({
    doc: (id: string) => doc(`${p}/${id}`),
    get: async () => {
      const ks = children(p);
      counter.reads += Math.max(1, ks.length);
      return { docs: ks.map((k) => ({ id: k.split("/").pop(), data: () => docs[k] })) };
    },
    where: (field: string, _op: string, value: unknown) => ({
      get: async () => {
        const ks = children(p).filter((k) => docs[k][field] === value);
        counter.reads += Math.max(1, ks.length);
        return { docs: ks.map((k) => ({ id: k.split("/").pop(), data: () => docs[k] })) };
      },
    }),
  });
  return { db: { collection: (c: string) => col(c) } as any, counter };
}

const mkWorker = (i: number): Worker =>
  ({
    code: `A${String(i).padStart(6, "0")}`,
    name: `ช่าง ${i}`,
    site: "SiteA",
    contractor: "ConX",
    position: "ช่างปูน",
    skills: { s01: i % 3 },
  }) as unknown as Worker;

(async () => {
  console.log("C1 cache core");
  {
    const owner = {};
    let calls = 0;
    await cached(owner, "k", mem, async () => ++calls);
    await cached(owner, "k", mem, async () => ++calls);
    check("repeat read served from cache (1 load)", calls === 1);

    let c2 = 0;
    const o2 = {};
    const slow = () => new Promise<number>((r) => setTimeout(() => r(++c2), 30));
    await Promise.all([1, 2, 3].map(() => cached(o2, "k", mem, slow)));
    check("3 concurrent renders share 1 load", c2 === 1);

    const a = await cached({}, "same", mem, async () => "A");
    const b = await cached({}, "same", mem, async () => "B");
    check("different db instances don't share entries", a === "A" && b === "B");
  }

  console.log("C2 stale-on-error");
  {
    const o = {};
    await cached(o, "k", short, async () => "good");
    await sleep(5);
    const v = await cached(o, "k", short, async () => {
      throw new Error("8 RESOURCE_EXHAUSTED");
    });
    check("quota error after expiry → serves last good copy", v === "good");
    check("staleSince() reports it", staleSince() !== null);
    await cached(o, "k", short, async () => "fresh");
    check("a successful reload clears the stale flag", staleSince() === null);

    let threw = false;
    try {
      await cached({}, "k", short, async () => {
        throw new Error("x");
      });
    } catch {
      threw = true;
    }
    check("error with no cached copy still throws", threw);
  }

  console.log("C3 snapshot codec");
  {
    const ws = Array.from({ length: 1531 }, (_, i) => mkWorker(i));
    const chunks = snapshotChunks(ws, 20_000);
    const maxLen = Math.max(...chunks.map((c) => Buffer.byteLength(c, "utf8")));
    check(`chunks respect the byte limit (${chunks.length} chunks, max ${maxLen}B)`, maxLen <= 20_000);
    check("round-trip keeps every worker in order", JSON.stringify(workersFromChunks(chunks)) === JSON.stringify(ws));
    check("empty list → no chunks", snapshotChunks([]).length === 0);
  }

  console.log("C4 listWorkers read cost (fake Firestore)");
  {
    const ws = Array.from({ length: 50 }, (_, i) => mkWorker(i));
    const base: Record<string, any> = { "config/app": { currentRoundId: "r1", dataVersion: "v1" } };
    for (const w of ws) base[`rounds/r1/workers/${w.code}`] = w;

    // snapshot present
    const snapDocs: Record<string, any> = {
      ...base,
      "rounds/r1": { label: "R1", dataDate: "2026-09", workerChunks: 0 },
    };
    const chunks = snapshotChunks(ws, 1_000);
    snapDocs["rounds/r1"].workerChunks = chunks.length;
    chunks.forEach((json, i) => (snapDocs[`rounds/r1/snapshot/workers_${i}`] = { json }));
    const s = fakeDb(snapDocs);
    const got = await listWorkers({}, s.db);
    const cold = s.counter.reads;
    check(`cold read uses snapshot: ${cold} reads (config + round + ${chunks.length} chunks)`, cold === 2 + chunks.length);
    check("snapshot returns every worker", got.length === ws.length);
    await listWorkers({ search: "ช่าง 1" }, s.db);
    check("warm read = 0 reads (filters run on cached list)", s.counter.reads === cold);

    // legacy: no snapshot → per-worker docs
    const l = fakeDb({ ...base, "rounds/r1": { label: "R1", dataDate: "2026-09" } });
    const lw = await listWorkers({}, l.db);
    check(`legacy fallback reads per-worker docs (${l.counter.reads} reads)`, lw.length === ws.length && l.counter.reads === 2 + ws.length);

    // partial snapshot (a chunk doc missing) → falls back instead of returning a short list
    const partial = { ...snapDocs };
    delete partial["rounds/r1/snapshot/workers_0"];
    const p = fakeDb(partial);
    check("missing chunk → legacy fallback, full list", (await listWorkers({}, p.db)).length === ws.length);
  }

  console.log("C5 getRoundTrend read cost");
  {
    const docs: Record<string, any> = {
      "config/app": { currentRoundId: "r2", dataVersion: "v1" },
      "rounds/r2": { label: "R2", dataDate: "2026-09", status: "current" },
      "rounds/r1": { label: "R1", dataDate: "2026-08", status: "archived" },
      "rounds/r2/summary/bySite": { groups: [] },
      "rounds/r1/summary/bySite": { groups: [] },
      "rounds/r2/summary/byContractor": { groups: [] },
      "rounds/r1/summary/byContractor": { groups: [] },
    };
    const { db, counter } = fakeDb(docs);
    const t1 = await getRoundTrend(db);
    const first = counter.reads;
    await getRoundTrend(db);
    check(`1st render reads Firestore (${first} reads)`, first > 0 && t1.hasPrevious);
    check("2nd render = 0 reads", counter.reads === first);
  }

  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
