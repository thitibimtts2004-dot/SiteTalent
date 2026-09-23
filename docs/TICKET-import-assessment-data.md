# TICKET — Import the master assessment workbook → real data

**Status:** OPEN · **Priority:** P1 · **Owner:** data owner (person who holds the HR assessment file)
**Filed:** 2026-09-22 · **Ref:** roadmap T-016 · **Blocks:** real numbers on every page

---

## Why this ticket exists

Every page in the app (`/` dashboard, `/sites`, `/workers`, `/criticality`, `/trends`) currently
shows numbers from a **60-worker DEV fixture** (`data/normalized.json`), NOT the real data.

Confirmed on 2026-09-22: there is **NO `.xlsx` / `.xls` / `.csv` anywhere in the repository**.
`data/` contains only the fixture. The `data/` folder is **git-ignored on purpose** (it holds worker
PII), so the master assessment file is never committed — it must be placed by hand on the machine
that runs the import.

**The application code needs NO change.** It is data-shape-driven. Only the source file is missing.

## What to do

1. **Get the master workbook** — the HR skill-assessment export, an `.xlsx` file.

2. **Put it in the `data/` folder** at the project root:
   ```
   data/<any-name>.xlsx
   ```
   - The importer picks the **first** file ending in `.xlsx` that is not an Excel temp file
     (`~$...`) — see `scripts/import.ts` (`findWorkbook`).
   - The workbook MUST contain a sheet named exactly **`ประเมินรายบุคคล`**.
   - Data rows start at **row 3** (rows 1–2 are headers).
   - The 17 base skill columns must hold only **0, 1, or 2**. Column layout is defined in
     `lib/xlsxMap.ts` (`META_COLS` = code/name/site/contractor/position; `SKILL_BASE_COLS` = the 17).

3. **(Optional) To also write Firestore** — provide Firebase credentials (both git-ignored):
   `.env` (Firebase config) + `serviceAccount*.json`. If you skip this, the import still
   regenerates the local fixture; it just does not push to the database.

4. **Run the import:**
   ```bash
   npm run import
   ```

5. **Verify it worked:**
   - The command exits `0` with **no "domain violation"** warnings.
   - `data/normalized.json` is regenerated with the real head-count.
   - Start the app (`npm run dev`) and open `/` — the head-count KPI should read the real number
     (≈1531 workers / 6 sites / 59 contractors), not 60.

## Troubleshooting

| Message | Meaning | Fix |
|---|---|---|
| `No .xlsx found in data/` | File not placed, wrong extension, or still a `~$` temp file | Put a real `.xlsx` in `data/` |
| `Sheet ประเมินรายบุคคล not found` | Wrong sheet name inside the workbook | Rename the sheet to `ประเมินรายบุคคล` |
| "domain violation" warnings | A base skill cell is outside {0,1,2} — wrong column read | Check the column layout matches `lib/xlsxMap.ts` |

## Out of scope

Pure data delivery — **do not change the importer or app code.** If parsing fails, fix the
workbook (sheet name / columns / values), not the code.

## Related files

- `scripts/import.ts` — the import pipeline (`findWorkbook` at line ~70)
- `lib/xlsxMap.ts` — sheet name, first data row, column mapping
- `data/normalized.json` — the output (git-ignored fixture, overwritten by the import)
- `data/` — git-ignored target folder for the master `.xlsx`
