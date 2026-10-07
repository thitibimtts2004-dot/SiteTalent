"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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
  LabelList,
} from "recharts";
import { aggregate } from "@/lib/dashboard";
import type { ClientWorker, DashboardFilters, GroupRow, SkillRow } from "@/lib/dashboard";
import { SKILLS, skillLabel } from "@/lib/skills";
import { exportWorkersXlsx } from "@/lib/exportWorkers";

const THAI = '"Noto Sans Thai", ui-sans-serif, system-ui, sans-serif';
// mockup palette
const C = { l2: "#E8722C", l1: "#EEC79A", l0: "#A9A9A9", accent: "#6C3BE0" };
const PASS = "#16a34a";
const FAIL = "#dc2626";
const THRESHOLD = 65; // target: % of people with ≥1 level-2 skill

const pct = (n: number) => `${n.toFixed(1)}%`;

/** Cross-filter dimming: everything but the selection fades when one is chosen. */
const DIM = 0.25;
const opacityFor = (selected: string | undefined, key: string) =>
  !selected || selected === key ? 1 : DIM;
const CLICKABLE = { cursor: "pointer" } as const;

/** Level legend (people view: a worker sits in the bucket of their HIGHEST level). */
const LEVEL_NAMES = {
  l2: "ระดับ 2 (ทำได้ผ่านมาตรฐาน)",
  l1: "ระดับ 1 (ทำได้บางส่วน)",
  l0: "ระดับ 0 (ยังทำไม่ได้)",
};

type ScatterView = "site" | "contractor";

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

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <h2 className="mb-4 text-lg font-semibold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

/** 100%-stacked bar of PEOPLE per group, each worker at their highest level.
 *  stackOffset="expand" normalizes each bar to 100%, so the label carries the
 *  headcount; rows sort best→worst by % at level 2, with the 65% target dashed. */
function StackedByGroup({
  rows,
  selected,
  onSelect,
}: {
  rows: GroupRow[];
  selected?: string;
  onSelect: (name: string) => void;
}) {
  const data = [...rows]
    .sort((a, b) => b.pctSkilled - a.pctSkilled || b.headcount - a.headcount)
    .map((r) => ({
      ...r,
      label: `${r.name} (${r.headcount.toLocaleString()} คน)`,
      // in-bar % on the level-2 segment; hidden when the segment is too thin to read
      pctLabel: r.pctSkilled >= 12 ? pct(r.pctSkilled) : "",
    }));
  return (
    <div style={{ width: "100%", height: Math.max(240, data.length * 42 + 40) }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          stackOffset="expand"
          margin={{ top: 20, right: 24, left: 8, bottom: 4 }}
        >
          <XAxis
            type="number"
            tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
            tick={{ fontFamily: THAI, fontSize: 12, fill: "#475569" }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={190}
            interval={0}
            tick={{ fontFamily: THAI, fontSize: 12, fill: "#334155" }}
          />
          <Tooltip
            formatter={(v: number, name: string) => [`${v.toLocaleString()} คน`, name]}
            labelFormatter={(l: string) => l}
            contentStyle={{ fontFamily: THAI, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontFamily: THAI, fontSize: 12, paddingTop: 4 }} />
          <Bar
            dataKey="p2"
            name={LEVEL_NAMES.l2}
            stackId="s"
            fill={C.l2}
            style={CLICKABLE}
            onClick={(d: { name?: string }) => d?.name && onSelect(d.name)}
          >
            {data.map((r) => (
              <Cell key={r.name} fillOpacity={opacityFor(selected, r.name)} />
            ))}
            <LabelList
              dataKey="pctLabel"
              position="insideLeft"
              style={{ fontFamily: THAI, fontSize: 12, fontWeight: 600, fill: "#fff" }}
            />
          </Bar>
          {(["p1", "p0"] as const).map((k) => (
            <Bar
              key={k}
              dataKey={k}
              name={k === "p1" ? LEVEL_NAMES.l1 : LEVEL_NAMES.l0}
              stackId="s"
              fill={k === "p1" ? C.l1 : C.l0}
              style={CLICKABLE}
              onClick={(d: { name?: string }) => d?.name && onSelect(d.name)}
            >
              {data.map((r) => (
                <Cell key={r.name} fillOpacity={opacityFor(selected, r.name)} />
              ))}
            </Bar>
          ))}
          <ReferenceLine
            x={THRESHOLD / 100}
            stroke="#334155"
            strokeDasharray="6 4"
            label={{ value: "เป้า 65%", position: "top", fontFamily: THAI, fontSize: 11, fill: "#334155" }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Skill labels a worker holds at `level`, decoded from the `sk` digits (SKILLS order). */
function skillsAt(w: ClientWorker, level: 1 | 2): string[] {
  return SKILLS.filter((_, i) => Number(w.sk?.[i] ?? 0) === level).map((s) => s.label);
}

function SkillChips({ title, skills, cls }: { title: string; skills: string[]; cls: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-40 shrink-0 text-xs text-slate-500">{title}</span>
      {skills.length === 0 ? (
        <span className="text-xs text-slate-400">—</span>
      ) : (
        skills.map((s) => (
          <span key={s} className={`rounded-full px-2.5 py-0.5 text-xs ${cls}`}>
            {s}
          </span>
        ))
      )}
    </div>
  );
}

type SkillSort = "workforce" | "l2";

/** People per skill (level 2 + level 1 stacked, absolute counts) — answers
 *  "which skill has the most workers / the most level-2 workers?" for HR. */
function SkillPanel({
  rows,
  headcount,
  selected,
  onSelect,
}: {
  rows: SkillRow[];
  headcount: number;
  selected?: string; // skill id
  onSelect: (id: string) => void;
}) {
  const [sort, setSort] = useState<SkillSort>("workforce");
  const sorted = [...rows]
    .sort((a, b) =>
      sort === "l2" ? b.l2 - a.l2 || b.l1 - a.l1 : b.l1 + b.l2 - (a.l1 + a.l2) || b.l2 - a.l2,
    )
    .map((r) => ({ ...r, workforce: r.l1 + r.l2 })); // bar-end label
  const share = (n: number) => (headcount === 0 ? "0%" : pct((n / headcount) * 100));

  return (
    <Panel title="จำนวนคนรายทักษะ (17 ทักษะ)">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-600">เรียงตาม:</span>
        {(
          [
            ["workforce", "แรงงานรวม (ระดับ 1 + 2)"],
            ["l2", "ระดับ 2"],
          ] as [SkillSort, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setSort(v)}
            className={`rounded-lg px-3 py-1 text-sm ${
              sort === v ? "bg-[#6C3BE0] text-white" : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ width: "100%", height: 17 * 30 + 60 }}>
        <ResponsiveContainer>
          <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }}>
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontFamily: THAI, fontSize: 12, fill: "#475569" }}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={170}
              interval={0}
              tick={{ fontFamily: THAI, fontSize: 12, fill: "#334155" }}
            />
            <Tooltip
              formatter={(v: number, name: string) => [`${v.toLocaleString()} คน (${share(v)})`, name]}
              contentStyle={{ fontFamily: THAI, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontFamily: THAI, fontSize: 12, paddingTop: 4 }} />
            {(["l2", "l1"] as const).map((k) => (
              <Bar
                key={k}
                dataKey={k}
                name={LEVEL_NAMES[k]}
                stackId="s"
                fill={C[k]}
                style={CLICKABLE}
                onClick={(d: { id?: string }) => d?.id && onSelect(d.id)}
              >
                {sorted.map((r) => (
                  <Cell key={r.id} fillOpacity={opacityFor(selected, r.id)} />
                ))}
                {k === "l1" && (
                  <LabelList
                    dataKey="workforce"
                    position="right"
                    style={{ fontFamily: THAI, fontSize: 11, fill: "#475569" }}
                  />
                )}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        คลิกแท่งเพื่อกรองทั้งหน้าตามทักษะนั้น (คลิกซ้ำเพื่อยกเลิก) ·
        1 คนทำได้หลายทักษะ จึงนับซ้ำได้ข้ามแถว — ตัวเลขแต่ละแถว = จำนวนคนที่ทำทักษะนั้นได้ (ห้ามรวมแถวเป็นจำนวนคน) ·
        % เทียบกับจำนวนคนในมุมมองปัจจุบัน · กราฟนี้ไม่ขึ้นกับตัวกรองทักษะ
      </p>
    </Panel>
  );
}

/** % printed in the middle of each donut slice (hidden on slivers < 3%). */
function renderPctLabel(p: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
  if (p.percent < 0.03) return null;
  const r = (p.innerRadius + p.outerRadius) / 2;
  const a = (-p.midAngle * Math.PI) / 180;
  return (
    <text
      x={p.cx + r * Math.cos(a)}
      y={p.cy + r * Math.sin(a)}
      textAnchor="middle"
      dominantBaseline="central"
      fill="#1e293b"
      fontFamily={THAI}
      fontSize={13}
      fontWeight={600}
    >
      {`${(p.percent * 100).toFixed(1)}%`}
    </text>
  );
}

// ── main ───────────────────────────────────────────────────────────────
/** URL query keys ↔ filter fields (?position=&site=&contractor=&skill=). */
const FILTER_KEYS = ["position", "site", "contractor", "skill", "level"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

export default function Dashboard({
  workers,
  initialFilters = {},
}: {
  workers: ClientWorker[];
  initialFilters?: DashboardFilters;
}) {
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters);
  const [scatterView, setScatterView] = useState<ScatterView>("site");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set()); // worker codes
  const toggleRow = (code: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  // keep the URL in sync (shareable / survives reload) without a server round-trip
  useEffect(() => {
    const q = new URLSearchParams();
    for (const k of FILTER_KEYS) if (filters[k]) q.set(k, filters[k]!);
    const qs = q.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [filters]);

  const setFilter = (k: FilterKey, v: string) => setFilters((f) => ({ ...f, [k]: v || undefined }));
  /** chart click: select, or clear when the same item is clicked again */
  const toggleFilter = (k: FilterKey, v: string) =>
    setFilters((f) => ({ ...f, [k]: f[k] === v ? undefined : v }));
  const clearAll = () => setFilters({});

  // one aggregate call drives KPIs + donut + both bar charts + the scatter
  const data = useMemo(() => aggregate(workers, filters), [workers, filters]);

  // worker-level rows for the drill-down table: exactly the fully-filtered workers
  const scopedWorkers = data.workers;

  const scatterRows = scatterView === "site" ? data.bySite : data.allContractors;
  const skillName = filters.skill ? skillLabel(filters.skill) : null;

  // donut counts PEOPLE (each worker once, at their highest in-scope level)
  const donutTotal = data.people.l0 + data.people.l1 + data.people.l2; // ignores the level filter
  const share = (v: number) => (donutTotal === 0 ? 0 : (v / donutTotal) * 100);
  const donut = (["l2", "l1", "l0"] as const)
    .map((k) => ({ key: k, name: LEVEL_NAMES[k], value: data.people[k], fill: C[k] }))
    .map((d) => ({ ...d, name: `${d.name} ${pct(share(d.value))}` }));

  // table = fully-filtered workers, narrowed by the search box,
  // most skilled first: skills at level 1+2 desc → level 2 desc → code asc (stable)
  const tableRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedWorkers
      .filter((w) => {
        if (q && !w.name.toLowerCase().includes(q) && !w.code.toLowerCase().includes(q))
          return false;
        return true;
      })
      .sort(
        (a, b) =>
          b.l1 + b.l2 - (a.l1 + a.l2) || b.l2 - a.l2 || a.code.localeCompare(b.code),
      );
  }, [scopedWorkers, search]);

  const [exporting, setExporting] = useState(false);
  const exportTable = async () => {
    setExporting(true);
    try {
      const scope = [
        filters.site && `ไซต์ ${filters.site}`,
        filters.contractor && `ผู้รับเหมา ${filters.contractor}`,
        filters.position && `ตำแหน่ง ${filters.position}`,
        skillName && `ทักษะ ${skillName}`,
        filters.level && `ระดับสูงสุด ${filters.level}`,
        search.trim() && `ค้นหา "${search.trim()}"`,
      ].filter(Boolean);
      const d = new Date();
      const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      await exportWorkersXlsx(tableRows, {
        scopeText: scope.length ? scope.join(" · ") : "ทั้งหมด",
        fileName: `SiteTalent_รายบุคคล_${stamp}.xlsx`,
      });
    } finally {
      setExporting(false);
    }
  };

  const switchScatter = (v: ScatterView) => {
    setScatterView(v);
  };

  const selects: { key: FilterKey; label: string; all: string; options: { value: string; label: string }[] }[] = [
    { key: "site", label: "ไซต์", all: "ทุกไซต์", options: data.sites.map((v) => ({ value: v, label: v })) },
    {
      key: "contractor",
      label: "ผู้รับเหมา",
      all: "ทุกผู้รับเหมา",
      options: data.contractors.map((v) => ({ value: v, label: v })),
    },
    { key: "skill", label: "ทักษะ", all: "ทุกทักษะ", options: SKILLS.map((s) => ({ value: s.id, label: s.label })) },
    { key: "position", label: "ตำแหน่ง", all: "ทุกตำแหน่ง", options: data.positions.map((v) => ({ value: v, label: v })) },
    {
      key: "level",
      label: "ระดับสูงสุด",
      all: "ทุกระดับ",
      options: (["2", "1", "0"] as const).map((v) => ({ value: v, label: LEVEL_NAMES[`l${v}`] })),
    },
  ];
  const active = selects.filter((s) => filters[s.key]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">ภาพรวมทักษะผู้รับเหมา</h1>
          <p className="mt-1 text-sm text-slate-500">
            สัดส่วนคนที่ผ่านมาตรฐาน (ระดับ 2) แยกตามไซต์ ผู้รับเหมา และทักษะ · กรองตามไซต์ ผู้รับเหมา
            ทักษะ และตำแหน่ง แล้วค้นหารายบุคคลได้
          </p>
        </div>
        {active.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-purple-300 hover:bg-purple-50 hover:text-[#6C3BE0]"
            title="เอาตัวกรองทั้งหมดออก"
          >
            <span aria-hidden>✕</span>
            ล้างตัวกรอง
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-[#6C3BE0]">{active.length}</span>
          </button>
        )}
      </header>

      {/* filter bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {selects.map((s) => (
            <label key={s.key} className="flex flex-col gap-1 text-xs text-slate-500">
              {s.label}
              <select
                value={filters[s.key] ?? ""}
                onChange={(e) => setFilter(s.key, e.target.value)}
                className={`rounded-lg border bg-white px-3 py-1.5 text-sm text-slate-800 ${
                  filters[s.key] ? "border-purple-400" : "border-slate-300"
                }`}
              >
                <option value="">{s.all}</option>
                {/* keep a selected value visible even if other filters removed it from the list */}
                {filters[s.key] && !s.options.some((o) => o.value === filters[s.key]) && (
                  <option value={filters[s.key]}>{filters[s.key]}</option>
                )}
                {s.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {active.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {active.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setFilter(s.key, "")}
                className="rounded-full bg-purple-50 px-3 py-1 text-xs text-purple-700 hover:bg-purple-100"
                title="เอาตัวกรองนี้ออก"
              >
                {s.label}:{" "}
                {s.key === "skill"
                  ? skillName
                  : s.key === "level"
                    ? LEVEL_NAMES[`l${filters.level}` as "l0" | "l1" | "l2"]
                    : filters[s.key]}{" "}
                ✕
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card
          label="คนผ่านมาตรฐาน (ระดับ 2)"
          value={pct(data.pctSkilled)}
          sub={`${data.people.l2.toLocaleString()} คน มีระดับ 2 ≥ 1 ทักษะ · เป้า ≥ 65%`}
        />
        {/* people whose BEST is level 1 (matches the donut); passed people who still
            hold a level-1 skill are named in the sub-line so training need isn't undercounted */}
        <Card
          label="ยังไม่ผ่านมาตรฐาน (ระดับ 1)"
          value={`${data.people.l1.toLocaleString()} คน`}
          sub={
            `${pct(data.headcount === 0 ? 0 : (data.people.l1 / data.headcount) * 100)} ของคนทั้งหมด` +
            (data.upskillable > 0
              ? ` · อีก ${data.upskillable.toLocaleString()} คนผ่านแล้ว แต่มีทักษะระดับ 1 ที่อบรมเพิ่มได้`
              : "")
          }
        />
        <Card label="จำนวนคน" value={data.headcount.toLocaleString()} />
        <Card
          label="ไซต์ / ผู้รับเหมา"
          value={`${data.siteCount} / ${data.contractorCount}`}
          sub="ในมุมมองปัจจุบัน"
        />
      </div>

      <p className="-mt-2 text-xs text-slate-500">
        💡 <b>คลิกที่กราฟ</b> (ชิ้นวงกลม · แท่ง · จุด) เพื่อกรองทั้งหน้า คลิกซ้ำเพื่อยกเลิก · ทุกตัวเลขบนหน้านี้<b>นับเป็นคน</b> (1 คน = 1 นับ ตามระดับสูงสุดที่ทำได้) · เลือกทักษะ = นับระดับของทักษะนั้น ·
        กราฟรายทักษะนับซ้ำได้ เพราะ 1 คนทำได้หลายทักษะ
      </p>

      {/* donut + summary */}
      {/* very wide screens: two equal halves, lined up with the row below */}
      <div className="grid gap-6 2xl:grid-cols-2">
        <Panel
          title={skillName ? `สัดส่วนระดับทักษะ — ${skillName}` : "สัดส่วนคนตามระดับทักษะสูงสุด"}
        >
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
                  labelLine={false}
                  label={renderPctLabel}
                  style={CLICKABLE}
                  onClick={(_: unknown, i: number) => toggleFilter("level", donut[i].key.slice(1))}
                >
                  {donut.map((d) => (
                    <Cell
                      key={d.key}
                      fill={d.fill}
                      fillOpacity={opacityFor(filters.level, d.key.slice(1))}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, name: string) => [
                    `${v.toLocaleString()} คน`,
                    name,
                  ]}
                  contentStyle={{ fontFamily: THAI, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontFamily: THAI, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="ความชำนาญรายไซต์ (นับเป็นคน)">
          <StackedByGroup
            rows={data.bySite}
            selected={filters.site}
            onSelect={(n) => toggleFilter("site", n)}
          />
        </Panel>
      </div>

      {/* very wide screens: scatter and contractors side by side */}
      <div className="grid gap-6 2xl:grid-cols-2">
        <Panel title="จำนวนคน × % คนผ่านมาตรฐาน — หากลุ่มที่ต่ำกว่าเป้า 65%">
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
          </div>
          <div style={{ width: "100%", height: 400 }}>
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
                  name="% ผ่านมาตรฐาน"
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontFamily: THAI, fontSize: 12, fill: "#475569" }}
                />
                <ReferenceLine
                  y={THRESHOLD}
                  stroke="#334155"
                  strokeDasharray="6 4"
                  label={{ value: "เป้า 65%", position: "insideBottomRight", fontFamily: THAI, fontSize: 11, fill: "#334155" }} // inside the plot: never clipped
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(v: number, name: string) => [
                    name === "% ผ่านมาตรฐาน" ? pct(v) : `${v} คน`,
                    name,
                  ]}
                  labelFormatter={() => ""}
                  contentStyle={{ fontFamily: THAI, fontSize: 12 }}
                />
                <Scatter
                  data={scatterRows}
                  style={CLICKABLE}
                  onClick={(d: { name?: string }) => d?.name && toggleFilter(scatterView, d.name)}
                >
                  {scatterRows.map((r) => (
                    <Cell
                      key={r.name}
                      fill={r.pctSkilled >= THRESHOLD ? PASS : FAIL}
                      fillOpacity={opacityFor(filters[scatterView], r.name)}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            จุดสีเขียว = ผ่านเป้า · จุดสีแดง = ต่ำกว่าเป้า · คลิกจุดเพื่อกรองทั้งหน้า (คลิกซ้ำเพื่อยกเลิก)
          </p>
        </Panel>
        <Panel title="ความชำนาญรายผู้รับเหมา (Top 10 ตามจำนวนคน · นับเป็นคน)">
          <StackedByGroup
            rows={data.byContractor}
            selected={filters.contractor}
            onSelect={(n) => toggleFilter("contractor", n)}
          />
        </Panel>
      </div>

      <SkillPanel
        rows={data.bySkill}
        headcount={data.headcount}
        selected={filters.skill}
        onSelect={(id) => toggleFilter("skill", id)}
      />

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
          <button
            type="button"
            onClick={exportTable}
            disabled={exporting || tableRows.length === 0}
            className="order-last ml-auto rounded-lg bg-[#16a34a] px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-50"
            title="ส่งออกแถวที่แสดงอยู่ (ตามตัวกรอง/การค้นหา) เป็นไฟล์ Excel"
          >
            {exporting ? "กำลังส่งออก…" : "⬇ Export Excel"}
          </button>
        </div>
        <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="w-8 px-2 py-2" aria-label="ดูทักษะ" />
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
              {tableRows.map((w) => {
                const open = expanded.has(w.code);
                return (
                  <Fragment key={w.code}>
                    <tr
                      onClick={() => toggleRow(w.code)}
                      className={`cursor-pointer border-t border-slate-100 text-slate-700 hover:bg-slate-50 ${
                        open ? "bg-orange-50/40" : ""
                      }`}
                      title="คลิกเพื่อดูว่าทำทักษะอะไรได้บ้าง"
                    >
                      <td className="px-2 py-2 text-center text-xs text-slate-400">{open ? "▾" : "▸"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{w.code}</td>
                      <td className="px-3 py-2">{w.name}</td>
                      <td className="px-3 py-2">{w.position}</td>
                      <td className="px-3 py-2">{w.site}</td>
                      <td className="px-3 py-2">{w.contractor}</td>
                      <td className="px-3 py-2 text-right text-slate-400">{w.l0}</td>
                      <td className="px-3 py-2 text-right">{w.l1}</td>
                      <td className="px-3 py-2 text-right font-medium text-[#E8722C]">{w.l2}</td>
                    </tr>
                    {open && (
                      <tr className="bg-orange-50/40">
                        <td />
                        <td colSpan={8} className="space-y-2 px-3 pb-3 pt-1">
                          <SkillChips
                            title={`${LEVEL_NAMES.l2} · ${w.l2}`}
                            skills={skillsAt(w, 2)}
                            cls="bg-[#E8722C] text-white"
                          />
                          <SkillChips
                            title={`${LEVEL_NAMES.l1} · ${w.l1}`}
                            skills={skillsAt(w, 1)}
                            cls="bg-[#EEC79A] text-slate-800"
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-slate-400">
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
