"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface SkillDatum {
  label: string;
  lvl1: number;
  lvl2: number;
}

const THAI = '"Noto Sans Thai", ui-sans-serif, system-ui, sans-serif';

/** Horizontal bars: long Thai skill labels sit on the Y axis with room,
 *  so the 17 labels never overlap (unlike a rotated X axis). */
export default function SkillBarChart({ data }: { data: SkillDatum[] }) {
  // sort by total proficient (both levels) so the fullest skills sit on top
  const rows = [...data].sort((a, b) => b.lvl2 + b.lvl1 - (a.lvl2 + a.lvl1));
  return (
    <div style={{ width: "100%", height: 600 }}>
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
            formatter={(v: number, name: string) => [`${v} คน`, name]}
            contentStyle={{ fontFamily: THAI, fontSize: 12 }}
          />
          <Legend
            wrapperStyle={{ fontFamily: THAI, fontSize: 12, paddingTop: 4 }}
          />
          {/* green = level 2 (works independently), amber = level 1 (needs a supervisor) */}
          <Bar
            dataKey="lvl2"
            name="ระดับ 2 (ทำเองได้)"
            stackId="lvl"
            fill="#16a34a"
          />
          <Bar
            dataKey="lvl1"
            name="ระดับ 1 (ต้องมีคนคุม)"
            stackId="lvl"
            fill="#f59e0b"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
