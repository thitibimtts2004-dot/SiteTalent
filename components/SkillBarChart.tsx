"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface SkillDatum {
  label: string;
  lvl2: number;
}

const THAI = '"Noto Sans Thai", ui-sans-serif, system-ui, sans-serif';

/** Horizontal bars: long Thai skill labels sit on the Y axis with room,
 *  so the 17 labels never overlap (unlike a rotated X axis). */
export default function SkillBarChart({ data }: { data: SkillDatum[] }) {
  const rows = [...data].sort((a, b) => b.lvl2 - a.lvl2);
  return (
    <div style={{ width: "100%", height: 560 }}>
      <ResponsiveContainer>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 8, right: 40, left: 8, bottom: 8 }}
        >
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontFamily: THAI, fontSize: 12, fill: "#475569" }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={160}
            tick={{ fontFamily: THAI, fontSize: 12, fill: "#334155" }}
          />
          <Tooltip
            cursor={{ fill: "rgba(37,99,235,0.06)" }}
            formatter={(v: number) => [`${v} คน`, "ระดับ 2"]}
            contentStyle={{ fontFamily: THAI, fontSize: 12 }}
          />
          <Bar dataKey="lvl2" fill="#2563eb" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
