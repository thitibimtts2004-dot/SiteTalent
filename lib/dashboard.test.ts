/**
 * Runnable test for the T-015 dashboard aggregation (pure).
 * Run: npm run test:dashboard   (tsx — needs Node 20)
 *
 * Asserts the LOCKED metrics, the position filter, the divide-by-zero guards,
 * the deterministic Top-10 contractor tie-break, and slimWorker's mapping.
 */
import { aggregate, slimWorker, pctSkilled, pctIndependent } from "./dashboard";
import type { ClientWorker } from "./dashboard";
import type { Worker } from "./types";

let failures = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name}`);
  }
}
/** float compare to 4 decimals — the metrics are %, exact ratios. */
const near = (a: number, b: number) => Math.abs(a - b) < 1e-4;

const cw = (
  code: string,
  name: string,
  site: string,
  contractor: string,
  position: string,
  l0: number,
  l1: number,
  l2: number,
): ClientWorker => ({ code, name, site, contractor, position, l0, l1, l2 });

// ── Hand-computed fixture ────────────────────────────────────────────────
// W1 A/X/ช่างไม้ 10/5/2 · W2 A/X/ช่างปูน 7/7/3 · W3 B/Y/ช่างไม้ 0/0/17
const fx: ClientWorker[] = [
  cw("W1", "สมชาย", "A", "X", "ช่างไม้", 10, 5, 2),
  cw("W2", "สมหญิง", "A", "X", "ช่างปูน", 7, 7, 3),
  cw("W3", "สมศักดิ์", "B", "Y", "ช่างไม้", 0, 0, 17),
];

console.log("aggregate — locked metrics over all workers");
const all = aggregate(fx);
// cells 17/12/22, total 51 → %skilled = 34/51*100
check("all cells", all.cells.l0 === 17 && all.cells.l1 === 12 && all.cells.l2 === 22);
check("all headcount", all.headcount === 3);
check("all %skilled = 34/51", near(all.pctSkilled, (34 / 51) * 100));
check("all %independent = 22/34", near(all.pctIndependent, (22 / 34) * 100));
check("positions sorted+unique", JSON.stringify(all.positions) === JSON.stringify(["ช่างปูน", "ช่างไม้"]));
check("bySite name asc", all.bySite.map((r) => r.name).join(",") === "A,B");
check("site A row", (() => {
  const a = all.bySite.find((r) => r.name === "A")!;
  return a.headcount === 2 && a.l0 === 17 && a.l1 === 12 && a.l2 === 5 && near(a.pctSkilled, (17 / 34) * 100);
})());

console.log("aggregate — position filter re-computes");
const carp = aggregate(fx, "ช่างไม้"); // W1 + W3 → 10/5/19, total 34
check("filter cells", carp.cells.l0 === 10 && carp.cells.l1 === 5 && carp.cells.l2 === 19);
check("filter headcount", carp.headcount === 2);
check("filter %skilled = 24/34", near(carp.pctSkilled, (24 / 34) * 100));
check("filter %independent = 19/24", near(carp.pctIndependent, (19 / 24) * 100));
check("filter keeps full positions list", carp.positions.length === 2);

console.log("guards — divide-by-zero");
const empty = aggregate([]);
check("empty %skilled = 0", empty.pctSkilled === 0);
check("empty %independent = 0", empty.pctIndependent === 0);
check("empty headcount = 0", empty.headcount === 0 && empty.bySite.length === 0);
// a worker recorded but all at level 0 → total>0 yet %skilled must be 0
const zeroSkilled = aggregate([cw("Z", "ว่าง", "A", "X", "p", 5, 0, 0)]);
check("all-level-0 %skilled = 0", zeroSkilled.pctSkilled === 0);
check("all-level-0 %independent = 0", zeroSkilled.pctIndependent === 0);
check("pctSkilled(0,0,0) guard", pctSkilled(0, 0, 0) === 0);
check("pctIndependent(0,0) guard", pctIndependent(0, 0) === 0);

console.log("Top-10 contractor — deterministic tie-break (headcount desc, name asc) + slice");
// 12 contractors, all headcount 1 → tie → name asc → top 10 = c01..c10
const twelve: ClientWorker[] = [];
for (let i = 1; i <= 12; i++) {
  const c = `c${String(i).padStart(2, "0")}`;
  twelve.push(cw(`T${i}`, c, "A", c, "p", 1, 1, 1));
}
const top = aggregate(twelve).byContractor;
check("top-10 length", top.length === 10);
check("top-10 first = c01", top[0].name === "c01");
check("top-10 last = c10", top[9].name === "c10");
// the scatter + KPI count need EVERY contractor, not just the Top 10
const allCons = aggregate(twelve).allContractors;
check("allContractors keeps all 12", allCons.length === 12);
check("allContractors same order as top-10 prefix", allCons.slice(0, 10).every((g, i) => g.name === top[i].name));
// headcount ordering wins over name: c99 with 3 workers must lead the 1-worker ties
const mixed = aggregate([
  ...twelve,
  cw("H1", "c99", "A", "c99", "p", 1, 1, 1),
  cw("H2", "c99", "A", "c99", "p", 1, 1, 1),
  cw("H3", "c99", "A", "c99", "p", 1, 1, 1),
]).byContractor;
check("headcount beats name", mixed[0].name === "c99" && mixed[0].headcount === 3);

console.log("slimWorker — maps totals, keeps code+name, drops the rest");
const full: Worker = {
  code: "K1",
  name: "กิตติ",
  site: "A",
  contractor: "X",
  position: "ช่างไม้",
  assessedDate: "2026-09-01",
  assessor: "หัวหน้า",
  skills: { s01: 2, s02: 1 },
  totals: { none: 10, lvl1: 5, lvl2: 2, total: 7, score: 9 },
};
const slim = slimWorker(full);
check("slim keeps code+name", slim.code === "K1" && slim.name === "กิตติ");
check("slim maps l0/l1/l2", slim.l0 === 10 && slim.l1 === 5 && slim.l2 === 2);
check("slim drops per-skill+assessor", !("skills" in slim) && !("assessor" in slim) && !("totals" in slim));

console.log(failures ? `\n${failures} FAILED` : "\nall passed");
process.exit(failures ? 1 : 0);
