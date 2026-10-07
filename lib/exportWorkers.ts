/**
 * Export the worker table to a styled .xlsx (browser-only).
 *
 * exceljs is loaded on demand so it never weighs on the dashboard's first load.
 * The sheet mirrors what the user sees: the same rows (filters, search, scatter
 * selection) in the same order, plus each worker's per-skill levels.
 */
import type { ClientWorker } from "./dashboard";
import { SKILLS } from "./skills";

const FONT = "Tahoma"; // ships with Windows/Office and renders Thai cleanly

// ARGB fills, matching the dashboard palette
const FILL = {
  header: "FFE8722C", // level-2 orange
  title: "FF334155",
  zebra: "FFFFF7F0",
  l2: "FFE8722C",
  l1: "FFEEC79A",
  l0: "FFF1F5F9",
};

/** Skill labels a worker holds at `level`, decoded from the `sk` digits. */
const skillsAt = (w: ClientWorker, level: number) =>
  SKILLS.filter((_, i) => Number(w.sk?.[i] ?? 0) === level).map((s) => s.label);

export async function exportWorkersXlsx(
  rows: ClientWorker[],
  opts: { scopeText: string; fileName: string },
): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "SiteTalent";
  wb.created = new Date();
  const ws = wb.addWorksheet("รายบุคคล");

  const fixed = [
    { header: "ลำดับ", key: "no", width: 7 },
    { header: "รหัส", key: "code", width: 12 },
    { header: "ชื่อ-นามสกุล", key: "name", width: 30 },
    { header: "ตำแหน่ง", key: "position", width: 22 },
    { header: "ไซต์", key: "site", width: 24 },
    { header: "ผู้รับเหมา", key: "contractor", width: 32 },
    { header: "ระดับ 0", key: "l0", width: 9 },
    { header: "ระดับ 1", key: "l1", width: 9 },
    { header: "ระดับ 2", key: "l2", width: 9 },
    { header: "รวมระดับ 1+2", key: "skilled", width: 12 },
    { header: "ทักษะระดับ 2 (ทำได้ผ่านมาตรฐาน)", key: "skills2", width: 40 },
    { header: "ทักษะระดับ 1 (ทำได้บางส่วน)", key: "skills1", width: 40 },
  ];
  const perSkill = SKILLS.map((s) => ({ header: s.label, key: s.id, width: 11 }));
  const columns = [...fixed, ...perSkill];
  ws.columns = columns.map((c) => ({ key: c.key, width: c.width }));
  const lastCol = columns.length;

  // ── title + scope lines (rows 1-2), header on row 4 ───────────────────
  ws.mergeCells(1, 1, 1, lastCol);
  const title = ws.getCell(1, 1);
  title.value = "ตารางรายบุคคล — ทักษะผู้รับเหมา (SiteTalent)";
  title.font = { name: FONT, size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.title } };
  title.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(1).height = 26;

  ws.mergeCells(2, 1, 2, lastCol);
  const sub = ws.getCell(2, 1);
  sub.value =
    `ขอบเขต: ${opts.scopeText} · ${rows.length.toLocaleString()} คน · ` +
    `ส่งออกเมื่อ ${new Date().toLocaleString("th-TH")} · ` +
    "ช่องรายทักษะ: 2 = ผ่านมาตรฐาน, 1 = ทำได้บางส่วน, 0 = ยังทำไม่ได้";
  sub.font = { name: FONT, size: 10, italic: true, color: { argb: "FF475569" } };
  sub.alignment = { indent: 1 };

  const HEADER_ROW = 4;
  const header = ws.getRow(HEADER_ROW);
  columns.forEach((c, i) => (header.getCell(i + 1).value = c.header));
  header.height = 36;
  header.eachCell((cell, col) => {
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    // per-skill headers a shade darker so the two blocks read apart
    const argb = col > fixed.length ? FILL.title : FILL.header;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: "FF9A3412" } } };
  });

  // ── data rows ───────────────────────────────────────────────────────
  const thin = { style: "thin" as const, color: { argb: "FFE2E8F0" } };
  rows.forEach((w, idx) => {
    const values: Record<string, string | number> = {
      no: idx + 1,
      code: w.code,
      name: w.name,
      position: w.position || "-",
      site: w.site,
      contractor: w.contractor,
      l0: w.l0,
      l1: w.l1,
      l2: w.l2,
      skilled: w.l1 + w.l2,
      skills2: skillsAt(w, 2).join(", ") || "-",
      skills1: skillsAt(w, 1).join(", ") || "-",
    };
    SKILLS.forEach((s, i) => (values[s.id] = Number(w.sk?.[i] ?? 0)));

    const row = ws.getRow(HEADER_ROW + 1 + idx);
    columns.forEach((c, i) => (row.getCell(i + 1).value = values[c.key]));
    const zebra = idx % 2 === 1;
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { name: FONT, size: 10 };
      cell.border = { top: thin, bottom: thin, left: thin, right: thin };
      const key = columns[col - 1].key;
      const numeric = col > fixed.length || ["no", "l0", "l1", "l2", "skilled"].includes(key);
      cell.alignment = {
        vertical: "top",
        horizontal: numeric ? "center" : "left",
        wrapText: ["skills2", "skills1", "position", "contractor"].includes(key),
      };
      if (zebra) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.zebra } };
      if (key === "l2" || key === "skilled") cell.font = { name: FONT, size: 10, bold: true };
      // colour the per-skill level cells like the dashboard legend
      if (col > fixed.length) {
        const lv = cell.value as number;
        const argb = lv === 2 ? FILL.l2 : lv === 1 ? FILL.l1 : FILL.l0;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
        if (lv === 2) cell.font = { name: FONT, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        if (lv === 0) cell.font = { name: FONT, size: 10, color: { argb: "FF94A3B8" } };
      }
    });
  });

  // keep the header + name columns visible while scrolling, and allow filtering
  ws.views = [{ state: "frozen", xSplit: 3, ySplit: HEADER_ROW }];
  ws.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: HEADER_ROW + rows.length, column: lastCol },
  };

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // revoking at once can cancel the download
}
