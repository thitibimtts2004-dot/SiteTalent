"use client";

import { useState } from "react";
import type { GroupRollup } from "@/lib/types";

/** Sortable-by-size rollup table with a name filter. Reused for both the
 *  per-site and per-contractor views. */
export default function RollupTable({
  title,
  rows,
  unit,
}: {
  title: string;
  rows: GroupRollup[];
  unit: string;
}) {
  const [q, setQ] = useState("");
  const filtered = rows.filter((r) =>
    r.name.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const maxLvl2 = Math.max(1, ...rows.map((r) => r.lvl2));
  // level-1 total per group is not stored on GroupRollup — sum it from bySkill
  const lvl1Of = (r: GroupRollup) =>
    Object.values(r.bySkill).reduce((a, s) => a + s.lvl1, 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-800">
          {title}{" "}
          <span className="text-sm font-normal text-slate-400">
            ({rows.length} {unit})
          </span>
        </h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาชื่อ…"
          className="w-48 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-4 font-medium">ชื่อ</th>
              <th className="py-2 pr-4 text-right font-medium">จำนวนคน</th>
              <th className="py-2 pr-4 text-right font-medium">ระดับ1 (รวม)</th>
              <th className="py-2 pr-4 text-right font-medium">ระดับ2 (รวม)</th>
              <th className="py-2 font-medium">สัดส่วนระดับ2</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.name} className="border-b border-slate-100">
                <td className="py-2 pr-4 text-slate-800">{r.name}</td>
                <td className="py-2 pr-4 text-right tabular-nums text-slate-700">
                  {r.workers.toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-amber-700">
                  {lvl1Of(r).toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-green-700">
                  {r.lvl2.toLocaleString()}
                </td>
                <td className="py-2">
                  <div className="h-2 w-full max-w-xs rounded bg-slate-100">
                    <div
                      className="h-2 rounded bg-blue-500"
                      style={{ width: `${(r.lvl2 / maxLvl2) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-400">
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
