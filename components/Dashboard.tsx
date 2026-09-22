"use client";

import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { aggregate } from "@/lib/dashboard";
import type { ClientWorker, GroupRow } from "@/lib/dashboard";

const THAI = '"Noto Sans Thai", ui-sans-serif, system-ui, sans-serif';
// mockup palette
const C = { l2: "#E8722C", l1: "#EEC79A", l0: "#A9A9A9", accent: "#6C3BE0" };
const PASS = "#16a34a";
const FAIL = "#dc2626";
const THRESHOLD = 65; // %skilled target line

const pct = (n: number) => `${n.toFixed(1)}%`;

type ScatterView = "site" | "contractor";
type Selected = { type: ScatterView; name: string } | null;

// ── small building blocks ────────────────────────────────────────────────
function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

/** 100%-stacked bar (level 0/1/2 mix per group). stackOffset="expand" normalizes
 *  each bar to 100% so you compare the MIX regardless of headcount. */
function StackedByGroup({ rows }: { rows: GroupRow[] }) {
  return (
    <div style={{ width: "100%", height: Math.max(220, rows.length * 42) }}>
      <ResponsiveContainer>
        <BarChart
          data={rows}
          layout="vertical"
          stackOffset="expand"
          margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
        >
          <XAxis
            type="number"
            tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
            tick={{ fontFamily: THAI, fontSize: 12, fill: "#475569" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fontFamily: THAI, fontSize: 12, fill: "#334155" }}
          />
          <Tooltip
            formatter={(v: number, name: string) => [`${v} เซลล์`, name]}
            labelFormatter={(l: string) => l}
            contentStyle={{ fontFamily: THAI, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontFamily: THAI, fontSize: 12, paddingTop: 4 }} />
          <Bar dataKey="l2" name="ระดับ 2 (ทำได้ผ่านมาตรฐาน)" stackId="s" fill={C.l2} />
          <Bar dataKey="l1" name="ระดับ 1 (ทำได้บางส่วน)" stackId="s" fill={C.l1} />
          <Bar dataKey="l0" name="ระดับ 0 (ยังทำไม่ได้)" stackId="s" fill={C.l0} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── main ───────────────────────────────────────────────────────────────
export default function Dashboard({ workers }: { workers: ClientWorker[] }) {
  const [position, setPosition] = useState("");
  const [scatterView, setScatterView] = useState<ScatterView>("site");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Selected>(null);

  // one aggregate call drives KPIs + donut + both bar charts + the scatter
  const data = useMemo(() => aggregate(workers, position), [workers, position]);

  // worker-level rows for the drill-down table (same position scope as the charts)
  const scopedWorkers = useMemo(
    () => (position ? workers.filter((w) => w.position === position) : workers),
    [workers, position],
  );

  const scatterRows = scatterView === "site" ? data.bySite : data.byContractor;

  const donut = [
    { key: "l2", name: "ระดับ 2 (ทำได้ผ่านมาตรฐาน)", value: data.cells.l2, fill: C.l2 },
    { key: "l1", name: "ระดับ 1 (ทำได้บางส่วน)", value: data.cells.l1, fill: C.l1 },
    { key: "l0", name: "ระดับ 0 (ยังทำไม่ได้)", value: data.cells.l0, fill: C.l0 },
  ];

  // table = scoped workers, narrowed by the clicked scatter group + the search box
  const tableRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedWorkers.filter((w) => {
      if (selected && w[selected.type] !== selected.name) return false;
      if (q && !w.name.toLowerCase().includes(q) && !w.code.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [scopedWorkers, selected, search]);

  const switchScatter = (v: ScatterView) => {
    setScatterView(v);
    setSelected(null); // a selection from the other view no longer applies
  };

  return (
    <div className="space-y-6">
      {/* controls */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-600" htmlFor="pos">
          ตำแหน่ง
        </label>
        <select
          id="pos"
          value={position}
          onChange={(e) => {
            setPosition(e.target.value);
            setSelected(null);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800"
        >
          <option value="">ทุกตำแหน่ง</option>
          {data.positions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {position && (
          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs text-purple-700">
            กรอง: {position}
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card label="ทักษะที่ทำได้ (%skilled)" value={pct(data.pctSkilled)} sub="≥ 65% = ผ่าน" />
        <Card
          label="ทำได้เอง (%independent)"
          value={pct(data.pctIndependent)}
          sub="ระดับ 2 ในกลุ่มที่ทำได้"
        />
        <Card label="จำนวนคน" value={data.headcount.toLocaleString()} />
        <Card
          label="ไซต์ / ผู้รับเหมา"
          value={`${data.bySite.length} / ${data.byContractor.length}`}
          sub="ในมุมมองปัจจุบัน"
        />
      </div>

      {/* donut + summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="สัดส่วนระดับทักษะ (ทุกเซลล์)">
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={donut}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                >
                  {donut.map((d) => (
                    <Cell key={d.key} fill={d.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, name: string) => [`${v.toLocaleString()} เซลล์`, name]}
                  contentStyle={{ fontFamily: THAI, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontFamily: THAI, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="ความชำนาญรายไซต์">
          <StackedByGroup rows={data.bySite} />
        </Panel>
      </div>

      <Panel title="ความชำนาญรายผู้รับเหมา (Top 10 ตามจำนวนคน)">
        <StackedByGroup rows={data.byContractor} />
      </Panel>

      {/* scatter */}
      <Panel title="จำนวนคน × %skilled — หากลุ่มที่ต่ำกว่าเป้า 65%">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm text-slate-600">มุมมอง:</span>
          {(["site", "contractor"] as ScatterView[]).map((v) => (
            <button
              key={v}
              onClick={() => switchScatter(v)}
              className={`rounded-lg px-3 py-1 text-sm ${
                scatterView === v
                  ? "bg-[#6C3BE0] text-white"
                  : "border border-slate-300 bg-white text-slate-700"
              }`}
            >
              {v === "site" ? "รายไซต์" : "รายผู้รับเหมา"}
            </button>
          ))}
          {selected && (
            <button
              onClick={() => setSelected(null)}
              className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
            >
              ล้างตัวเลือก: {selected.name} ✕
            </button>
          )}
        </div>
        <div style={{ width: "100%", height: 340 }}>
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 12, right: 24, left: 8, bottom: 24 }}>
              {/* pass zone (green) above the line, fail zone (red) below */}
              <ReferenceArea y1={THRESHOLD} y2={100} fill={PASS} fillOpacity={0.06} />
              <ReferenceArea y1={0} y2={THRESHOLD} fill={FAIL} fillOpacity={0.06} />
              <XAxis
                type="number"
                dataKey="headcount"
                name="จำนวนคน"
                tick={{ fontFamily: THAI, fontSize: 12, fill: "#475569" }}
                label={{ value: "จำนวนคน", position: "bottom", fontFamily: THAI, fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="pctSkilled"
                name="%skilled"
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontFamily: THAI, fontSize: 12, fill: "#475569" }}
              />
              <ReferenceLine
                y={THRESHOLD}
                stroke="#334155"
                strokeDasharray="6 4"
                label={{ value: "เป้า 65%", position: "right", fontFamily: THAI, fontSize: 11 }}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(v: number, name: string) => [
                  name === "%skilled" ? pct(v) : `${v} คน`,
                  name,
                ]}
                labelFormatter={() => ""}
                contentStyle={{ fontFamily: THAI, fontSize: 12 }}
              />
              <Scatter
                data={scatterRows}
                onClick={(d: { name?: string }) =>
                  d?.name && setSelected({ type: scatterView, name: d.name })
                }
              >
                {scatterRows.map((r) => (
                  <Cell key={r.name} fill={r.pctSkilled >= THRESHOLD ? PASS : FAIL} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          จุดสีเขียว = ผ่านเป้า · จุดสีแดง = ต่ำกว่าเป้า · คลิกจุดเพื่อกรองตารางด้านล่าง
        </p>
      </Panel>

      {/* drill-down worker table (internal-use record lookup) */}
      <Panel title="ตารางรายบุคคล (ค้นหา/สืบค้นภายในองค์กร)">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ หรือ รหัสพนักงาน…"
            className="w-64 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800"
          />
          <span className="text-xs text-slate-400">{tableRows.length.toLocaleString()} คน</span>
          {selected && (
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs text-purple-700">
              {selected.type === "site" ? "ไซต์" : "ผู้รับเหมา"}: {selected.name}
            </span>
          )}
        </div>
        <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">รหัส</th>
                <th className="px-3 py-2">ชื่อ</th>
                <th className="px-3 py-2">ตำแหน่ง</th>
                <th className="px-3 py-2">ไซต์</th>
                <th className="px-3 py-2">ผรม.</th>
                <th className="px-3 py-2 text-right">ระดับ 0</th>
                <th className="px-3 py-2 text-right">ระดับ 1</th>
                <th className="px-3 py-2 text-right">ระดับ 2</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((w) => (
                <tr key={w.code} className="border-t border-slate-100 text-slate-700">
                  <td className="px-3 py-2 font-mono text-xs">{w.code}</td>
                  <td className="px-3 py-2">{w.name}</td>
                  <td className="px-3 py-2">{w.position}</td>
                  <td className="px-3 py-2">{w.site}</td>
                  <td className="px-3 py-2">{w.contractor}</td>
                  <td className="px-3 py-2 text-right text-slate-400">{w.l0}</td>
                  <td className="px-3 py-2 text-right">{w.l1}</td>
                  <td className="px-3 py-2 text-right font-medium text-[#E8722C]">{w.l2}</td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                    ไม่พบข้อมูลตามเงื่อนไข
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
