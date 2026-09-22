# Coding Failure Patterns

> One `## CFP-<N>` block per pattern. Symptom / Root / Prevention / Detection / topic / count / recurrences.

## CFP-1
Symptom: Asked to verify that existing code satisfies a ticket (T-006 round-aware import), I "verified" it by reading the source myself and then asked the user to accept a verified-by-code-read close — producing NO runnable test and NO independent checker.
Root: Treated my own reading of the code as sufficient proof of correctness/completeness, and skipped the harness verification discipline ("does it actually work?" → test cases + a fresh-context doer≠checker), because the code visibly matched the spec.
Prevention: To verify that code is complete/correct (not just present), AUTHOR concrete test cases that exercise the claimed behavior and RUN them via a spawned fresh-context Agent (or an emulator / injected fake) — never substitute assert-by-read + a user decision for an independent test. Reading the code answers "does this exist"; a passing test answers "does this work".
Detection: A verification or close of a correctness/completeness claim that leaves no test artifact and no spawned-checker proof in .sessions/.
topic: verification-independent-test
count: 0
recurrences: []
