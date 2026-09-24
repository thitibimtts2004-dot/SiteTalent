/**
 * Runnable test for lib/rollup.ts (T-008). Parity: rollupWorkers over the
 * fixture's workers must deep-equal the rollups the import wrote into
 * data/normalized.json. Scoped: a one-contractor subset rolls up to itself.
 * Also covers lib/scope.ts (URL helpers) and getScopedRollups (fixture path).
 * Run: npm run test:rollup   (tsx — needs Node 20)
 */
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { rollupWorkers } from "./rollup";
import { scopeFrom, scopeQuery, isScoped } from "./scope";
import { getScopedRollups } from "./data";
import type { NormalizedData } from "./types";

let failures = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name}`);
  }
}

const fx = JSON.parse(
  readFileSync("data/normalized.json", "utf8"),
) as NormalizedData;

console.log("parity vs import output (data/normalized.json)");
const all = rollupWorkers(fx.workers);
check("overview equal", isDeepStrictEqual(all.overview, fx.overview));
check("bySkill equal", isDeepStrictEqual(all.bySkill, fx.bySkill));
check("bySite equal (incl. order)", isDeepStrictEqual(all.bySite, fx.bySite));
check(
  "byContractor equal (incl. order)",
  isDeepStrictEqual(all.byContractor, fx.byContractor),
);

console.log("scoped subset (top contractor)");
const top = fx.byContractor[0];
const subset = fx.workers.filter((w) => w.contractor === top.name);
const scoped = rollupWorkers(subset);
check("overview.workers = subset size", scoped.overview.workers === subset.length);
check("subset size = contractor row workers", subset.length === top.workers);
check("exactly 1 contractor", scoped.overview.contractors === 1);
check(
  "contractor row equals the unscoped row",
  isDeepStrictEqual(scoped.byContractor[0], top),
);
check(
  "site workers sum to subset",
  scoped.bySite.reduce((n, s) => n + s.workers, 0) === subset.length,
);

console.log("empty input");
const none = rollupWorkers([]);
check("0 workers, 0% (no divide by zero)", none.overview.workers === 0 && none.overview.overallLvl2Pct === 0);

console.log("scope helpers (lib/scope.ts)");
check("scopeFrom: empty params → {}", isDeepStrictEqual(scopeFrom({}), {}));
check("scopeFrom: undefined → {}", isDeepStrictEqual(scopeFrom(undefined), {}));
check(
  "scopeFrom: first value wins, blank dropped",
  isDeepStrictEqual(scopeFrom({ site: ["A", "B"], contractor: "  " }), { site: "A" }),
);
check(
  "scopeFrom: URLSearchParams",
  isDeepStrictEqual(
    scopeFrom(new URLSearchParams("contractor=%E0%B8%9A%20X&site=S")),
    { site: "S", contractor: "บ X" },
  ),
);
check("scopeQuery: unscoped → ''", scopeQuery({}) === "");
check(
  "scopeQuery round-trips through scopeFrom",
  isDeepStrictEqual(
    scopeFrom(new URLSearchParams(scopeQuery({ site: "S 1", contractor: "หจก. ก&ข" }))),
    { site: "S 1", contractor: "หจก. ก&ข" },
  ),
);
check("isScoped", !isScoped({}) && isScoped({ contractor: "x" }));

// tsx emits CommonJS (no top-level await) → async cases in an IIFE.
(async () => {
  console.log("getScopedRollups (fixture path)");
  const un = await getScopedRollups({}, null);
  check("unscoped equals the summary rollups", isDeepStrictEqual(un, all));
  const sc = await getScopedRollups({ contractor: top.name }, null);
  check("scoped: exactly 1 contractor row", sc.byContractor.length === 1);
  check("scoped: row is the top contractor", sc.byContractor[0]?.name === top.name);
  check("scoped: overview.workers = contractor headcount", sc.overview.workers === top.workers);
  const ghost = await getScopedRollups({ contractor: "__no_such_contractor__" }, null);
  check("unknown scope → 0 workers, no rows", ghost.overview.workers === 0 && ghost.bySite.length === 0);

  if (failures) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\nall rollup checks passed");
})();
