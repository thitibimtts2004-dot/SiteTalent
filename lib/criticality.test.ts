/**
 * Runnable test for the T-005 criticality logic. Exercises the REAL
 * flagSkill + buildCriticality (pure) and getCriticality (fixture integration).
 * Run: npm run test:criticality   (tsx — needs Node 20)
 *
 * tsx emits CommonJS, so top-level `await` is unsupported → the async case is
 * wrapped in an IIFE (same fix as lib/trend.test.ts).
 */
import { flagSkill, buildCriticality, getCriticality } from "./data";
import { SKILL_IDS } from "./skills";
import type { SkillRollup, GroupRollup, ShortageFlags } from "./types";

let failures = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name}`);
  }
}
const eqFlags = (a: ShortageFlags, b: ShortageFlags) =>
  a.skillShort === b.skillShort &&
  a.operatorShort === b.operatorShort &&
  a.leaderShort === b.leaderShort;

const F = (skillShort: boolean, operatorShort: boolean, leaderShort: boolean) =>
  ({ skillShort, operatorShort, leaderShort });
const R = (lvl1: number, lvl2: number, none = 0): SkillRollup => ({
  none,
  lvl1,
  lvl2,
});

console.log("flagSkill — the three independent flags (strict <)");
// C1: all three fire — proficient 60%, lvl1 45%, lvl2 15%
check("C1 all-three", eqFlags(flagSkill(R(45, 15), 100), F(true, true, true)));
// C2: none — proficient 80%, lvl1 55%, lvl2 25%
check("C2 none", eqFlags(flagSkill(R(55, 25), 100), F(false, false, false)));
// C3: exact thresholds 70/50/20 → strict < → none fire
check("C3 boundary", eqFlags(flagSkill(R(50, 20), 100), F(false, false, false)));
// C4: leader only — proficient 75%, lvl1 60%, lvl2 15%
check("C4 leader-only", eqFlags(flagSkill(R(60, 15), 100), F(false, false, true)));
// C5: operator only — proficient 75%, lvl1 40%, lvl2 35%
check("C5 operator-only", eqFlags(flagSkill(R(40, 35), 100), F(false, true, false)));
// C6: total=0 → guarded, no flag (no divide-by-zero)
check("C6 zero-total guard", eqFlags(flagSkill(R(0, 0), 0), F(false, false, false)));

console.log("buildCriticality — composition + breaching groups");
{
  const overallBySkill = { s01: R(6, 3, 1) }; // s01 90%/60%/30% → no flag
  const sites: GroupRollup[] = [
    { name: "A", workers: 10, lvl2: 1, bySkill: { s01: R(1, 1, 8) } }, // 20%/10%/10% → all flag
    { name: "B", workers: 10, lvl2: 3, bySkill: { s01: R(6, 3, 1) } }, // 90%/60%/30% → no flag
  ];
  const contractors: GroupRollup[] = [
    { name: "ผรม.X", workers: 10, lvl2: 1, bySkill: { s01: R(2, 1, 7) } }, // 30%/20%/10% → flag
  ];
  const skills = buildCriticality(10, overallBySkill, sites, contractors);
  const s01 = skills.find((s) => s.skillId === "s01")!;
  const s02 = skills.find((s) => s.skillId === "s02")!; // absent → 0/0/0
  check("C7 maps all 17 skills", skills.length === SKILL_IDS.length);
  check("C7 s01 overall not flagged", s01.flagged === false);
  check(
    "C7 s01 breaching sites = [A]",
    s01.breachingSites.length === 1 && s01.breachingSites[0].name === "A",
  );
  check(
    "C7 s01 breaching contractors = [ผรม.X]",
    s01.breachingContractors.length === 1 &&
      s01.breachingContractors[0].name === "ผรม.X",
  );
  check("C7 absent skill s02 flagged (0/0/0)", s02.flagged === true);
  // C7b: the "no-skill" bucket is surfaced (overallBySkill s01 = none 1 of 10)
  check(
    "C7b s01 none exposed (1 → 10%)",
    s01.overall.none === 1 && s01.overall.nonePct === 0.1,
  );
  // C7c: the three groups sum to 100% (none+lvl1+lvl2 invariant) — the whole point
  check(
    "C7c nonePct+lvl1Pct+lvl2Pct = 1",
    Math.abs(
      s01.overall.nonePct + s01.overall.lvl1Pct + s01.overall.lvl2Pct - 1,
    ) < 1e-9,
  );
  // C9 (T-014): per-company none breakdown — every group with none>0, biggest first
  check(
    "C9 s01 noneSites = [A:8, B:1] desc",
    s01.noneSites.length === 2 &&
      s01.noneSites[0].name === "A" &&
      s01.noneSites[0].none === 8 &&
      s01.noneSites[1].name === "B" &&
      s01.noneSites[1].none === 1,
  );
  check(
    "C9 s01 noneContractors = [ผรม.X:7]",
    s01.noneContractors.length === 1 &&
      s01.noneContractors[0].name === "ผรม.X" &&
      s01.noneContractors[0].none === 7,
  );
  // absent skill s02 (0/0/0 everywhere) → no group has none>0 → both lists empty
  check(
    "C9 s02 excludes zero-none groups",
    s02.noneSites.length === 0 && s02.noneContractors.length === 0,
  );
}

void (async () => {
  console.log("getCriticality — fixture integration");
  const report = await getCriticality(null);
  check("C8 17 skills", report.skills.length === SKILL_IDS.length);
  const s07 = report.skills.find((s) => s.skillId === "s07")!;
  check("C8 s07 flagged on fixture", s07.flagged === true);
  check("C8 round label present", Boolean(report.round.label));

  console.log(failures ? `\n${failures} FAILED` : "\nall passed");
  process.exit(failures ? 1 : 0);
})();
