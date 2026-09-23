# Master Roadmap

> Status: `[ ]` pending -> `[/]` in progress -> `[X]` done

---

## T-000: Project initialized
- [X] T-000 · P2 · project scaffolded by project_init.py

## T-001: Phase 1 Dashboard build
- [X] T-001 · P1 · done 2026-09-09 · SiteTalent Phase 1 read-only dashboard (Next.js + Firestore) — 8 sections, build clean, data verified (1531 workers)

## T-016: Import the master assessment workbook → real 1531-worker data
- [ ] T-016 · P1 · depends_on: — · Independent-of: T-015 (data-only delivery; no code change)
  Title: Place the master assessment .xlsx in data/ and run the import so every page shows real numbers
  ContextTask: All pages (/ dashboard, /sites, /workers, /criticality, /trends) run on the 60-worker DEV fixture (data/normalized.json). Confirmed 2026-09-22: NO .xlsx/.xls/.csv exists anywhere in the repo — data/ holds only the fixture. data/ is git-ignored (worker PII) so the master file is never committed; the data owner must place it on the machine that runs the import. Code is data-shape-driven — NO code change needed, only the source file. Full operator runbook: docs/TICKET-import-assessment-data.md.
  Goal: real numbers (≈1531 workers / 6 sites / 59 contractors) render across the app.
  How-Check: (1) copy the master workbook to data/<any-name>.xlsx (importer takes the first non-~$ .xlsx — scripts/import.ts findWorkbook ~line 70); it must have a sheet named exactly "ประเมินรายบุคคล", data from row 3, 17 base skill cols in {0,1,2} per lib/xlsxMap.ts. (2) optional Firestore write needs .env + serviceAccount*.json (both git-ignored). (3) Run: npm run import. Expect: exit 0, no "domain violation" warnings, data/normalized.json regenerated with real head-count; open / and the head-count KPI reads ≈1531 not 60.
  Out-of-Scope: NO code change — pure data delivery. Parse failure = fix the workbook (sheet name / columns / values), not the importer.
  Relate File: scripts/import.ts, lib/xlsxMap.ts, data/normalized.json (output), docs/TICKET-import-assessment-data.md
