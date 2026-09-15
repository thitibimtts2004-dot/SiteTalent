task: SiteTalent — round-aware data layer (Phase 1 of Login-feature plan)
phase: done
next: Phase 2 = 6-digit-code Login + route guard (app/login, session cookie, middleware); Phase 3 = admin user-management page. auditLog enabled per user decision. roundId format = monthly YYYY-MM.

## Phase 1 — round-aware import/data (DONE, code + partial verify)
- lib/types.ts: added Round / RoundSource / RoundStatus types
- scripts/import.ts: --round/--date/--label/--source args; writes rounds/{roundId}/workers/* + rounds/{roundId}/summary/* + rounds/{roundId} meta doc; sets config/app.currentRoundId; archives previous current round
- lib/data.ts: reads config/app.currentRoundId then rounds/{roundId}/summary/* + rounds/{roundId}/workers; fixture fallback preserved
- VERIFIED (all pass): tsc --noEmit clean · npm run import wrote round 2026-09 (1531 workers, anchor 239/53/89, VALIDATION PASSED) · all 3 pages render LIVE from round 2026-09 — / (1531/6/59/7%), /sites (6 sites + 59 contractors, counts match), /workers (filters + list, no hang)
- Fixed a wedged dev server mid-verify: killed stuck PID 18172 on port 3000 (taskkill), restarted clean via preview_start; the `.next` EPERM lock cleared when the holding process died (rm -rf .next was permission-denied but not needed).

engine: manual-boot ok (v1.37.0 at plugin cache) · hooks: OFF (boot glob broken by `ls -F` alias appending *; needs client restart for hooks) — gates run manually
