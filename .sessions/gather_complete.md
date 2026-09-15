# Gather Complete — SiteTalent Phase 1 Dashboard
date: 2026-09-08

## Task
Build Phase 1 = read-only reporting Dashboard (part 01 หน้าสรุปรายงาน) from the existing master xlsx.

## Confirmed decisions (user, 2026-09-08)
- Delivery: **web app** (not static HTML) — chosen for future expansion into Phase 2 (auth / assessment write / score history).
- Data source: **Firebase Cloud Firestore** — dashboard reads live from Firestore (user changed mind from snapshot → DB). One-time import loads xlsx → Firestore.
- Stack: **Next.js (App Router) + TypeScript + Tailwind + Recharts + Firebase (Firestore)**. Firestore now; Firebase Auth added in Phase 2 without rewrite.
- CONSTRAINT: agent cannot create the Firebase project or enter credentials (prohibited). User creates the Firebase project + Firestore + service-account key + web config; code reads all of it from env (gitignored). Agent provides exact console steps.
- Dev-preview: import pipeline emits normalized data → seeds Firestore AND writes a local dev fixture (`data/normalized.json`, gitignored) so the UI can be built/verified before Firebase is wired. Production reads Firestore only.

## Phase 2 scope (clarified by user 2026-09-09)
- SiteTalent is a REPORTING/dashboard layer ONLY — it does NOT build the assessment workflow (data entry / re-eval / evidence photos / cross-site identity). The user ALREADY has a separate assessment system that owns that.
- Phase 2 goal = replace the one-time Excel import with a LIVE feed from that existing assessment system: SiteTalent pulls → processes → displays on the Dashboard.
- Ingest method (user choice 2026-09-09): **DIRECT DATABASE CONNECTION** to the existing system's DB. (DB engine TBD — ask before P2 build.)
- Remaining roadmap after this clarification: P1 Dashboard (Excel now) → P2 direct-DB sync → P3 polish (Login-to-view Dashboard [user must-have], Export, mobile). Dropped: build-assessment-forms / re-eval / photo-upload / identity (owned by the external system).

## Data source (verified this session)
File: `data/Master ข้อมูลประเมินทักษะผู้รับเหมา.xlsx` — 17 sheets.

### `ประเมินรายบุคคล` — RAW per-person (source of truth), FULLY MAPPED
- Physical rows 1535; header at row index 2; data from index 3; **1531 real workers** (numeric ลำดับ).
- Meta cols 0-7: ลำดับ, Location(=Site), สังกัดผู้รับเหมา(contractor), รหัส(code A0000xx), ชื่อ-สกุล, หมายเหตุ/ตำแหน่ง, วันที่ประเมิน, ผู้ประเมิน.
- Skills cols 8-58 = 17 skills × 3 (base, lvl1-flag, lvl2-flag). **BASE columns = the real 0/1/2 score**; the 2 flag cols are redundant one-hots. Base col indices: 8,11,14,17,20,23,26,29,32,35,38,41,44,47,50,53,56.
- Triplet encoding VERIFIED — only 3 combos exist file-wide: (0,0,0)=score0, (1,1,0)=lvl1, (2,0,1)=lvl2. → read base col only; lvl2 count per skill = count(base==2).
- Totals cols 59-65: ไม่มีทักษะ, ทักษะระดับ1, ทักะระดับ2(sic, idx61), รวมทักษะ, คะแนนรวมทักษะ, คะแนนเต็ม(=34=17*2), หมายเหตุ.
- ⚠️ GOTCHA: in-file per-row totals are NOT reliable (a sample row summed 14+5+1=20 > 17 skills). **DO NOT trust cols 59-61; recompute every total from the 17 base cols.**
- Scale (verified): 6 sites — Valles Haus 674, Escent Hatyai 2 381, Escent Nakhon Si 204, Renovation of UFM Building 103, Live Ramintra 95, CBH SKV12 74 (=1531). 59 contractors.

### Other sheets
- `ข้อมูลใหม่`: aggregate per Site×Contractor, 12 rows × 55 cols — counts of ไม่มี/ระดับ1/ระดับ2 for each of 17 skills. Cross-check + fast site rollup. Verified consistent (Escent Hatyai 2 งานปูน: 239+53+89=381).
- Ignore `Report สรุป *` (broken #VALUE! formulas). Ignore `ประเมินรายบุคคล (3)` (separate/older, 1643×27) for Phase 1.

## Score scale
0 = ทำไม่ได้ · ระดับ1 = ทำได้บางส่วน/ต้องมีผู้ควบคุม · ระดับ2 = ทำได้ดีผ่านมาตรฐาน.
Headline metric = count of people at ระดับ2 per skill.

## 17 skills (order)
งานปูน · งานสี · งานกระเบื้อง/ผนัง · งานฝ้า/เพดาน · งานไม้ · โครงสร้างคอนกรีต(Precast) · โครงสร้างเหล็ก(เชื่อม) · โครงสร้างทั่วไป · ติดตั้งสุขภัณฑ์ · ติดตั้ง Protection · ระบบไฟฟ้า · ระบบประปา · ระบบระบายอากาศ · งานเหล็ก · งานมุงหลังคา · อลูมิเนียมคอมโพสิต · ติดตั้งรั้ว.

## Environment
Node v22.20.0, npm 10.9.3, Python 3.14 + openpyxl 3.1.5. Greenfield (no existing scaffold).
