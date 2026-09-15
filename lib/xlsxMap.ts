/** Column map for the master workbook. All indices are 0-based.
 *  Verified against the real file during Phase 1 gather (2026-09-08). */

export const SHEET_NAME = "ประเมินรายบุคคล"; // raw per-person = source of truth
export const HEADER_ROW = 2; // 0-based header row
export const FIRST_DATA_ROW = 3; // data starts here

/** Meta columns 0-7. */
export const META_COLS = {
  seq: 0, // ลำดับ  (numeric -> a real worker row)
  site: 1, // Location
  contractor: 2, // สังกัดผู้รับเหมา
  code: 3, // รหัส (A0000xx)
  name: 4, // ชื่อ-สกุล
  position: 5, // หมายเหตุ / ตำแหน่ง
  assessedDate: 6, // วันที่ประเมิน
  assessor: 7, // ผู้ประเมิน
} as const;

/**
 * Base score column for each of the 17 skills (order 1..17).
 * Each skill occupies 3 columns: [base, lvl1-flag, lvl2-flag].
 * The BASE column holds the real 0/1/2 score. The two flag columns are
 * redundant one-hots (only combos (0,0,0),(1,1,0),(2,0,1) exist file-wide),
 * so we read the base column ONLY.
 */
export const SKILL_BASE_COLS = [
  8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53, 56,
];

/**
 * In-file total columns (59-61). UNRELIABLE — a sample row summed to > 17.
 * Kept for reference/debug only; every total is recomputed from the base cols.
 */
export const UNRELIABLE_TOTAL_COLS = { none: 59, lvl1: 60, lvl2: 61 } as const;

/** Aggregate sheet used to cross-check the recomputed rollups. */
export const CROSSCHECK_SHEET = "ข้อมูลใหม่";
