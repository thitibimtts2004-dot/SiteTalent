# SiteTalent — Phase 1 Dashboard

Read-only reporting dashboard for contractor skill assessments, built from the
master Excel workbook. Stack: Next.js (App Router) + TypeScript + Tailwind +
Recharts + Firebase Firestore.

## Quick start (dev — no Firebase needed)

```bash
npm install
npm run import   # xlsx -> data/normalized.json (dev fixture) + validation report
npm run dev      # http://localhost:3000
```

The dashboard runs on the local fixture until Firebase is configured.

## Pages

- `/` ภาพรวม — KPI + จำนวนคนระดับ 2 ต่อ 17 ทักษะ
- `/sites` รายไซต์ & ผู้รับเหมา
- `/workers` รายบุคคล — ค้นหา / กรอง / แบ่งหน้า

## Data

Source sheet `ประเมินรายบุคคล`: 1531 workers, 6 sites, 59 contractors, 17 skills.
Each skill score is read from the **base column** of its triplet; all totals are
**recomputed** (the in-file total columns are unreliable). Rollups are
cross-checked against sheet `ข้อมูลใหม่` by the import validation report.

## Wiring Firebase (for live data)

1. Firebase console → create a project → enable **Cloud Firestore**.
2. Project settings → *Your apps* → add a **Web app** → copy the config into
   `.env.local` (the `NEXT_PUBLIC_FIREBASE_*` keys — see `.env.example`).
3. Project settings → *Service accounts* → **Generate new private key** → save the
   JSON somewhere gitignored → set `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env`.
4. `npm run import` again → now also upserts `workers/*` + `summary/*` to Firestore.
5. No Firestore rule change needed: the dashboard reads **server-side** via the
   admin SDK (service account, in `lib/data.ts`), which bypasses security rules.
   Keep the default locked rules so worker PII is never exposed to the browser.

## Scripts

| command | what |
|---|---|
| `npm run import` | rebuild the fixture + (if creds set) sync Firestore |
| `npm run dev` | dev server |
| `npm run build` / `npm run start` | production build / serve |
