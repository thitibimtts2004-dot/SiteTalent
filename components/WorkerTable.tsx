"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import type { Worker } from "@/lib/types";
import { SKILLS } from "@/lib/skills";

const PAGE = 50;
const LVL = [
  "bg-slate-100 text-slate-400",
  "bg-amber-100 text-amber-700",
  "bg-green-100 text-green-700",
];

export default function WorkerTable({
  workers,
  sites,
  contractors,
}: {
  workers: Worker[];
  sites: string[];
  contractors: string[];
}) {
  const [q, setQ] = useState("");
  const [site, setSite] = useState("");
  const [con, setCon] = useState("");
  const [skill, setSkill] = useState("");
  const [lvl, setLvl] = useState(""); // "" = ทุกระดับ · "1" · "2" (only meaningful with a skill)
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return workers.filter((w) => {
      if (site && w.site !== site) return false;
      if (con && w.contractor !== con) return false;
      if (skill) {
        const lv = w.skills[skill] ?? 0;
        // level chosen → exact match · no level → any proficiency (>=1)
        if (lvl ? lv !== Number(lvl) : lv < 1) return false;
      }
      if (
        s &&
        !w.name.toLowerCase().includes(s) &&
        !w.code.toLowerCase().includes(s)
      )
        return false;
      return true;
    });
  }, [workers, q, site, con, skill, lvl]);

  // Where do the matching workers concentrate? (answers Q4 — only with a skill picked)
  const topGroup = (key: "site" | "contractor") => {
    const counts = new Map<string, number>();
    for (const w of filtered) counts.set(w[key], (counts.get(w[key]) ?? 0) + 1);
    let best = "";
    let n = 0;
    for (const [k, v] of counts)
      if (v > n) {
        best = k;
        n = v;
      }
    return best ? { name: best, n } : null;
  };
  const topSite = skill ? topGroup("site") : null;
  const topCon = skill ? topGroup("contractor") : null;

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const rows = filtered.slice(cur * PAGE, cur * PAGE + PAGE);

  const onFilter =
    (setter: (v: string) => void) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(0);
    };

  const ctl =
    "rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          value={q}
          onChange={onFilter(setQ)}
          placeholder="ค้นหา ชื่อ/รหัส…"
          className={`${ctl} w-52`}
        />
        <select value={site} onChange={onFilter(setSite)} className={ctl}>
          <option value="">ทุกไซต์</option>
          {sites.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={con} onChange={onFilter(setCon)} className={ctl}>
          <option value="">ทุกผู้รับเหมา</option>
          {contractors.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={skill} onChange={onFilter(setSkill)} className={ctl}>
          <option value="">ทุกทักษะ</option>
          {SKILLS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={lvl}
          onChange={onFilter(setLvl)}
          className={ctl}
          disabled={!skill}
          title={!skill ? "เลือกทักษะก่อน" : "กรองตามระดับความชำนาญ"}
        >
          <option value="">ทุกระดับ</option>
          <option value="1">ระดับ 1 (ต้องมีคนคุม)</option>
          <option value="2">ระดับ 2 (ทำเองได้)</option>
        </select>
      </div>

      <div className="text-sm text-slate-500">
        พบ {filtered.length.toLocaleString()} คน
      </div>

      {skill && filtered.length > 0 && (topSite || topCon) && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-slate-700">
          เจอมากสุดที่{" "}
          {topSite && (
            <>
              <b className="text-slate-900">{topSite.name}</b> ({topSite.n} คน)
            </>
          )}
          {topSite && topCon && " · "}
          {topCon && (
            <>
              ผรม <b className="text-slate-900">{topCon.name}</b> ({topCon.n} คน)
            </>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="px-3 py-2 font-medium">รหัส</th>
              <th className="px-3 py-2 font-medium">ชื่อ-สกุล</th>
              <th className="px-3 py-2 font-medium">ไซต์</th>
              <th className="px-3 py-2 font-medium">ผู้รับเหมา</th>
              {SKILLS.map((s) => (
                <th
                  key={s.id}
                  title={s.label}
                  className="px-2 py-2 text-center font-medium"
                >
                  {s.order}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-medium">รวม</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w, i) => (
              <tr key={w.code || i} className="border-t border-slate-100">
                <td className="whitespace-nowrap px-3 py-1.5 text-slate-500">
                  {w.code}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-slate-800">
                  {w.name}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">
                  {w.site}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">
                  {w.contractor}
                </td>
                {SKILLS.map((s) => {
                  const lvl = w.skills[s.id] ?? 0;
                  return (
                    <td key={s.id} className="px-1 py-1 text-center">
                      <span
                        className={`inline-block h-6 w-6 rounded text-center leading-6 ${LVL[lvl]}`}
                      >
                        {lvl}
                      </span>
                    </td>
                  );
                })}
                <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">
                  {w.totals.score}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5 + SKILLS.length}
                  className="py-6 text-center text-slate-400"
                >
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          disabled={cur === 0}
          onClick={() => setPage(cur - 1)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
        >
          ก่อนหน้า
        </button>
        <span className="text-sm text-slate-500">
          หน้า {cur + 1} / {pages}
        </span>
        <button
          disabled={cur >= pages - 1}
          onClick={() => setPage(cur + 1)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
        >
          ถัดไป
        </button>
      </div>

      <p className="text-xs text-slate-400">
        เลขในช่องทักษะ = ระดับ (0/1/2) · เลข 1–17 บนหัวตาราง = ทักษะตามลำดับ
        (ชี้เมาส์เพื่อดูชื่อเต็ม)
      </p>
    </div>
  );
}
