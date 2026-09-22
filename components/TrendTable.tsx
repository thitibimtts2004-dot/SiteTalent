import type { GroupTrend, TrendPoint } from "@/lib/types";

/** Current value + a coloured change indicator (▲ up / ▼ down / – flat). */
function Cell({ p }: { p: TrendPoint }) {
  const up = p.delta > 0;
  const down = p.delta < 0;
  const sign = up ? "▲" : down ? "▼" : "–";
  const color = up ? "text-green-600" : down ? "text-red-600" : "text-slate-400";
  return (
    <span className="tabular-nums">
      <span className="text-slate-800">{p.cur.toLocaleString()}</span>{" "}
      <span className={color}>
        {sign}
        {p.delta !== 0 && Math.abs(p.delta).toLocaleString()}
      </span>
    </span>
  );
}

/** Presentational round-over-round table (no interactivity → no client hooks).
 *  Reused for the per-site and per-contractor trend views. Sorted by the size
 *  of the level-2 change so the biggest movers surface first. */
export default function TrendTable({
  title,
  rows,
  unit,
}: {
  title: string;
  rows: GroupTrend[];
  unit: string;
}) {
  const sorted = [...rows].sort(
    (a, b) => Math.abs(b.lvl2.delta) - Math.abs(a.lvl2.delta),
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-800">
        {title}{" "}
        <span className="text-sm font-normal text-slate-400">
          ({rows.length} {unit})
        </span>
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-4 font-medium">ชื่อ</th>
              <th className="py-2 pr-4 text-right font-medium">จำนวนคน</th>
              <th className="py-2 pr-4 text-right font-medium">ระดับ1 (รวม)</th>
              <th className="py-2 pr-4 text-right font-medium">ระดับ2 (รวม)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.name} className="border-b border-slate-100">
                <td className="py-2 pr-4 text-slate-800">
                  {r.name}
                  {r.isNew && (
                    <span className="ml-2 rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-700">
                      ใหม่
                    </span>
                  )}
                  {r.dropped && (
                    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                      หายไป
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 text-right">
                  <Cell p={r.workers} />
                </td>
                <td className="py-2 pr-4 text-right">
                  <Cell p={r.lvl1} />
                </td>
                <td className="py-2 pr-4 text-right">
                  <Cell p={r.lvl2} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-400">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
