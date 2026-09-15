/** The 17 assessed skills, in the exact order they appear in the workbook
 *  (sheet `ประเมินรายบุคคล`). id is a stable slug; label is the Thai display. */
export interface SkillMeta {
  id: string;
  label: string;
  order: number; // 1..17
}

export const SKILLS: SkillMeta[] = [
  { id: "s01", label: "งานปูน", order: 1 },
  { id: "s02", label: "งานสี", order: 2 },
  { id: "s03", label: "งานกระเบื้อง/ผนัง", order: 3 },
  { id: "s04", label: "งานฝ้า/เพดาน", order: 4 },
  { id: "s05", label: "งานไม้", order: 5 },
  { id: "s06", label: "โครงสร้างคอนกรีต (Precast)", order: 6 },
  { id: "s07", label: "โครงสร้างเหล็ก (เชื่อม)", order: 7 },
  { id: "s08", label: "โครงสร้างทั่วไป", order: 8 },
  { id: "s09", label: "ติดตั้งสุขภัณฑ์", order: 9 },
  { id: "s10", label: "ติดตั้ง Protection", order: 10 },
  { id: "s11", label: "ระบบไฟฟ้า", order: 11 },
  { id: "s12", label: "ระบบประปา", order: 12 },
  { id: "s13", label: "ระบบระบายอากาศ", order: 13 },
  { id: "s14", label: "งานเหล็ก", order: 14 },
  { id: "s15", label: "งานมุงหลังคา", order: 15 },
  { id: "s16", label: "อลูมิเนียมคอมโพสิต", order: 16 },
  { id: "s17", label: "ติดตั้งรั้ว", order: 17 },
];

export const SKILL_IDS = SKILLS.map((s) => s.id);

export const skillLabel = (id: string): string =>
  SKILLS.find((s) => s.id === id)?.label ?? id;
