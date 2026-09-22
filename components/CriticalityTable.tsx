import type {
  SkillCriticality,
  ShortageFlags,
  ScopeBreach,
  GroupNone,
} from "@/lib/types";

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** The three flag badges (only the raised ones are shown). */
function Flags({ f }: { f: ShortageFlags }) {
  const badges: { on: boolean; label: string; cls: string }[] = [
    { on: f.skillShort, label: "เสี่ยงขาดทักษะ", cls: "bg-red-50 text-red-700" },
    { on: f.operatorShort, label: "ขาดผู้ปฏิบัติ", cls: "bg-amber-50 text-amber-700" },
    { on: f.leaderShort, label: "ขาดผู้นำ/สอนงาน", cls: "bg-violet-50 text-violet-700" },
  ];
  const shown = badges.filter((b) => b.on);
  if (shown.length === 0) {
    return <span className="text-xs text-green-600">ผ่านเกณฑ์</span>;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((b) => (
        <span key={b.label} className={`rounded px-1.5 py-0.5 text-xs ${b.cls}`}>
          {b.label}
        </span>
      ))}
    </span>
  );
}

/** Comma-separated names of the groups that breach ≥1 flag (or –). */
function Breaches({ groups }: { groups: ScopeBreach[] }) {
  if (groups.length === 0) return <span className="text-slate-300">–</span>;
  return (
    <span className="text-xs text-slate-600">
      {groups.map((g) => g.name).join(", ")}
    </span>
  );
}

/** One row of the none drill-down: "ไซต์: A 8 · B 1" (hidden if empty). */
function NoneList({ label, groups }: { label: string; groups: GroupNone[] }) {
  if (groups.length === 0) return null;
  return (
    <div className="text-xs text-slate-500">
      <span className="text-slate-400">{label}: </span>
      {groups.map((g, i) => (
        <span key={g.name}>
          {i > 0 && " · "}
          {g.name} {g.none}
        </span>
      ))}
    </div>
  );
}

/** The "ไม่มีทักษะ" cell: the overall % that expands (native <details>, no
 *  client hooks) to show WHICH companies the level-0 workers are in. A skill
 *  nobody lacks (no group with none>0) stays a plain %. */
function NoneCell({ s }: { s: SkillCriticality }) {
  const pctText = pct(s.overall.nonePct);
  const hasBreakdown = s.noneSites.length + s.noneContractors.length > 0;
  if (!hasBreakdown) {
    return (
      <td className="py-2 pr-4 text-right align-top tabular-nums text-slate-400">
        {pctText}
      </td>
    );
  }
  return (
    <td className="py-2 pr-4 text-right align-top tabular-nums text-slate-400">
      <details>
        <summary className="cursor-pointer list-none select-none">
          {pctText} <span className="text-slate-300">▸</span>
        </summary>
        <div className="mt-1 space-y-0.5 text-left">
          <NoneList label="ไซต์" groups={s.noneSites} />
          <NoneList label="ผรม" groups={s.noneContractors} />
        </div>
      </details>
    </td>
  );
}

/** Presentational skill-criticality table (no interactivity → no client hooks).
 *  Flagged skills surface first; ties break by the lowest "ทำได้" proportion. */
export default function CriticalityTable({
  rows,
}: {
  rows: SkillCriticality[];
}) {
  const flagCount = (f: ShortageFlags) =>
    Number(f.skillShort) + Number(f.operatorShort) + Number(f.leaderShort);
  const sorted = [...rows].sort((a, b) => {
    const fc = flagCount(b.overall.flags) - flagCount(a.overall.flags);
    if (fc !== 0) return fc;
    return a.overall.proficientPct - b.overall.proficientPct;
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-4 font-medium">ทักษะ</th>
              <th className="py-2 pr-4 text-right font-medium">ทำได้ (ร1+ร2)</th>
              <th className="py-2 pr-4 text-right font-medium">ไม่มีทักษะ</th>
              <th className="py-2 pr-4 text-right font-medium">ระดับ1</th>
              <th className="py-2 pr-4 text-right font-medium">ระดับ2</th>
              <th className="py-2 pr-4 font-medium">ธงเตือน</th>
              <th className="py-2 font-medium">กลุ่มที่ขาด (ไซต์ · ผรม)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr
                key={s.skillId}
                className={`border-b border-slate-100 ${s.flagged ? "bg-red-50/30" : ""}`}
              >
                <td className="py-2 pr-4 text-slate-800">{s.label}</td>
                <td className="py-2 pr-4 text-right tabular-nums text-slate-700">
                  {pct(s.overall.proficientPct)}
                </td>
                <NoneCell s={s} />
                <td className="py-2 pr-4 text-right tabular-nums text-amber-700">
                  {pct(s.overall.lvl1Pct)}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-green-700">
                  {pct(s.overall.lvl2Pct)}
                </td>
                <td className="py-2 pr-4">
                  <Flags f={s.overall.flags} />
                </td>
                <td className="py-2">
                  {s.flagged ? (
                    <div className="space-y-0.5">
                      <div>
                        <span className="text-xs text-slate-400">ไซต์: </span>
                        <Breaches groups={s.breachingSites} />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">ผรม: </span>
                        <Breaches groups={s.breachingContractors} />
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-300">–</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
