task: merge feature branches into main + fix hydration mismatch (2026-09-23)
phase: in_progress
next: user to `git push origin main` (29e150e hydration fix is local-only). Optional: `git stash drop` once satisfied — stash@{0} holds stale pre-merge harness session state (pop did not apply; current hook-regenerated files are newer, nothing of project value lost).

- Merged origin/feat/dashboards-and-harness (app code only: T-015 dashboard, /criticality, /trends, 4 test suites) + origin/feat/import-assessment-data (T-016 ticket). Harness files + macOS-only .claude/launch.json kept at main versions. Both merges already on origin/main.
- Verified post-merge: tsc clean, 4 test suites pass, next build clean, 5 pages 200 with live data (1531 workers / 6 sites).
- Fixed SSR hydration mismatch: lib/dashboard.ts sorts used bare localeCompare (server vs en-US browser ordered Thai/Latin differently) → shared Intl.Collator("th"). Verified no hydration error in console.
- Team notes: T-016 already satisfied on this machine; roadmap T-006 block contains T-015 text (source-branch issue, untouched); team commits harness/.sessions files to git.
