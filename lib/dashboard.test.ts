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
// cells 17/12/22 · people: every worker has a level-2 skill → 3/3 at level 2
check("all cells", all.cells.l0 === 17 && all.cells.l1 === 12 && all.cells.l2 === 22);
check("all headcount", all.headcount === 3);
check("all %skilled = 3/3 people", near(all.pctSkilled, 100));
check("all %independent = 3/3 people", near(all.pctIndependent, 100));
check("positions sorted+unique", JSON.stringify(all.positions) === JSON.stringify(["ช่างปูน", "ช่างไม้"]));
check("bySite name asc", all.bySite.map((r) => r.name).join(",") === "A,B");
check("site A row", (() => {
  const a = all.bySite.find((r) => r.name === "A")!;
  return a.headcount === 2 && a.l0 === 17 && a.l1 === 12 && a.l2 === 5 && near(a.pctSkilled, 100);
})());

console.log("aggregate — position filter re-computes");
const carp = aggregate(fx, "ช่างไม้"); // W1 + W3 → 10/5/19, total 34
check("filter cells", carp.cells.l0 === 10 && carp.cells.l1 === 5 && carp.cells.l2 === 19);
check("filter headcount", carp.headcount === 2);
check("filter %skilled = 2/2 people", near(carp.pctSkilled, 100));
check("filter %independent = 2/2 people", near(carp.pctIndependent, 100));
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

console.log("filters — site / contractor / skill (T-018)");
// sk digits in SKILL_IDS order: s01 = first char, s02 = second
const fw: ClientWorker[] = [
  { ...cw("F1", "ก", "A", "X", "p1", 15, 1, 1), sk: "21" + "0".repeat(15) },
  { ...cw("F2", "ข", "A", "Y", "p2", 16, 1, 0), sk: "01" + "0".repeat(15) },
  { ...cw("F3", "ค", "B", "Y", "p1", 16, 0, 1), sk: "12" + "0".repeat(15) },
];
const bySiteA = aggregate(fw, { site: "A" });
check("site filter headcount", bySiteA.headcount === 2 && bySiteA.siteCount === 1);
check("site chart keeps every site under a site filter (cross-filter)", bySiteA.bySite.length === 2);
check("site filter cells = F1+F2 totals", bySiteA.cells.l0 === 31 && bySiteA.cells.l1 === 2 && bySiteA.cells.l2 === 1);
const conY = aggregate(fw, { contractor: "Y" });
check("contractor filter headcount", conY.headcount === 2 && conY.contractorCount === 1);
check("contractor chart keeps every contractor under a contractor filter", conY.allContractors.length === 2);
check("site chart IS narrowed by the contractor filter", conY.bySite.every((r) => r.headcount <= 2) && conY.bySite.reduce((a, r) => a + r.headcount, 0) === 2);
const s01 = aggregate(fw, { skill: "s01" }); // levels 2,0,1 → one cell each
check("skill filter: one cell per worker", s01.cells.l0 === 1 && s01.cells.l1 === 1 && s01.cells.l2 === 1);
check("skill filter %skilled = 1/3 people at level 2", near(s01.pctSkilled, (1 / 3) * 100));
check("skill filter %independent = 1/2", near(s01.pctIndependent, 50));
const s02A = aggregate(fw, { skill: "s02", site: "A" }); // F1=1, F2=1
check("skill+site combine", s02A.cells.l1 === 2 && s02A.cells.l0 === 0 && s02A.cells.l2 === 0);
check("skill filter per-site row", s02A.bySite[0].l1 === 2 && s02A.bySite[0].headcount === 2);
check("string arg still = position", aggregate(fw, "p1").headcount === 2);
// cascading options: each list ignores its own filter, honours the others
const optA = aggregate(fw, { site: "A" });
check("site options ignore own filter", optA.sites.join(",") === "A,B");
check("contractor options scoped by site", optA.contractors.join(",") === "X,Y");
const optY = aggregate(fw, { contractor: "Y" });
check("site options scoped by contractor", optY.sites.join(",") === "A,B");
check("position options scoped by contractor", optY.positions.join(",") === "p1,p2");
const optB = aggregate(fw, { site: "B" });
check("contractor options narrow to the site", optB.contractors.join(",") === "Y");
check("no match → zeros, no crash", aggregate(fw, { site: "none" }).headcount === 0);

console.log("people view — each worker once, at their highest in-scope level");
// F1 has a level-2 skill → 2 · F2 best is level 1 → 1 · F3 has a level-2 → 2 · Z all zero → 0
const pw = [...fw, { ...cw("Z1", "ง", "B", "X", "p1", 17, 0, 0), sk: "0".repeat(17) }];
const pAll = aggregate(pw);
check("people split 1/1/2", pAll.people.l0 === 1 && pAll.people.l1 === 1 && pAll.people.l2 === 2);
check("people sum = headcount", pAll.people.l0 + pAll.people.l1 + pAll.people.l2 === pAll.headcount);
check("cells untouched by people view", pAll.cells.l0 === 64 && pAll.cells.l1 === 2 && pAll.cells.l2 === 2);
const pSiteA = pAll.bySite.find((r) => r.name === "A")!;
check("per-site people (A: F1→2, F2→1)", pSiteA.p0 === 0 && pSiteA.p1 === 1 && pSiteA.p2 === 1);
const pSiteB = pAll.bySite.find((r) => r.name === "B")!;
check("per-site people (B: F3→2, Z1→0)", pSiteB.p0 === 1 && pSiteB.p1 === 0 && pSiteB.p2 === 1);
// one skill: a worker's level IS that skill's level (s01 digits 2,0,1,0)
const pS01 = aggregate(pw, { skill: "s01" });
check("skill filter people = that skill's level", pS01.people.l0 === 2 && pS01.people.l1 === 1 && pS01.people.l2 === 1);
check("%skilled = people at level 2 / headcount (2/4)", near(pAll.pctSkilled, 50));
check("%independent = level 2 / (level 1 + 2) people (2/3)", near(pAll.pctIndependent, (2 / 3) * 100));
check("per-site %skilled (A 1/2, B 1/2)", near(pSiteA.pctSkilled, 50) && near(pSiteB.pctSkilled, 50));
check("pctSkilled helper = p2/total", near(pctSkilled(1, 1, 2), 50));
// F1 = level 2 in s01 AND level 1 in s02 → passed but still trainable; F3 has l1=0
check("upskillable = level-2 people who also hold a level-1 skill", pAll.upskillable === 1);
check("upskillable is 0 under a skill filter", aggregate(pw, { skill: "s02" }).upskillable === 0);
console.log("level filter — donut slice (highest in-scope level)");
const lv1 = aggregate(pw, { level: "1" }); // F2 is the only worker whose best is level 1
check("level 1 keeps only F2", lv1.headcount === 1 && lv1.workers[0].code === "F2");
check("donut ignores the level filter (all slices kept)", lv1.people.l0 === 1 && lv1.people.l1 === 1 && lv1.people.l2 === 2);
check("level 2 → 2 workers, %skilled 100", aggregate(pw, { level: "2" }).headcount === 2 && near(aggregate(pw, { level: "2" }).pctSkilled, 100));
// with a skill, the level is THAT skill's level: s01 digits 2,0,1,0 → level 0 = F2 + Z1
check("level follows the skill filter", aggregate(pw, { skill: "s01", level: "0" }).headcount === 2);
check("level + site combine", aggregate(pw, { level: "2", site: "B" }).workers.map((w) => w.code).join() === "F3");
check("workers list = fully filtered rows", aggregate(pw, { site: "A" }).workers.length === 2);
check("empty people = 0", aggregate([]).people.l0 + aggregate([]).people.l1 + aggregate([]).people.l2 === 0);

console.log("bySkill — people per level for each of the 17 skills");
// pw s01 digits 2,0,1,0 · s02 digits 1,1,2,0
const sk = aggregate(pw).bySkill;
check("bySkill has 17 rows in order", sk.length === 17 && sk[0].id === "s01" && sk[16].id === "s17");
check("s01 people 2/1/1", sk[0].l0 === 2 && sk[0].l1 === 1 && sk[0].l2 === 1);
check("s02 people 1/2/1", sk[1].l0 === 1 && sk[1].l1 === 2 && sk[1].l2 === 1);
check("each skill row sums to headcount", sk.every((r) => r.l0 + r.l1 + r.l2 === 4));
check("bySkill ignores the skill filter", aggregate(pw, { skill: "s01" }).bySkill[1].l1 === 2);
check("bySkill honours the site filter", aggregate(pw, { site: "A" }).bySkill[0].l2 === 1 && aggregate(pw, { site: "A" }).bySkill[0].l0 === 1);
check("bySkill label", sk[0].label === "งานปูน");

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
check("slim encodes per-skill levels", slim.sk === "21" + "0".repeat(15));

console.log(failures ? `\n${failures} FAILED` : "\nall passed");
process.exit(failures ? 1 : 0);
