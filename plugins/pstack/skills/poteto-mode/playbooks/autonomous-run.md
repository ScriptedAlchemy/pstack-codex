### Autonomous run

**You own the exit condition. Define done, then drive to it without stopping.**

1. State the exit condition as a checkable predicate before the first iteration (tests green, repro fixed, all N PRs merged, pixel-diff zero).
2. Pick the wake mechanism from CODEX.md. While the turn is active, use bounded tool waits to watch CI, merges, or refs; a watcher child can report an event but does not guarantee a future task wake. For follow-up beyond the active turn, use the supported Codex heartbeat automation tool, verify the saved schedule, and record the predicate and durable state path. If scheduling is unavailable, save a resume capsule and disclose that future monitoring is not armed.
3. Each iteration makes the smallest change the evidence justifies, verifies it against the predicate, commits if it advanced, discards changes that didn't help. Belt-and-suspenders that "might help" gets reverted, not left to ride.
   Sequence the work via the **sequence-verifiable-units** principle skill, verifying each unit before the next instead of batching checks at the end.
4. Address discoveries within the authorized task: related bugs, flaky verifiers, review noise, and fixable drift. A persistence request does not authorize unrelated skill edits, PRs, or external actions; record those as follow-ups and request direction when they block progress. Continue safe in-scope work without needless confirmation. Surface irreversible actions, genuine product or preference calls no experiment can settle, and real dead ends. Keep the predicate as the main drive.
5. Checkpoint every iteration via the **show-me-your-work** skill, a row for what changed and whether the predicate moved.
6. Stop when the predicate is met. A plateau is not a stop, so keep going and pivot your approach to push past it. Surface a genuine dead end rather than spinning, and never relax the predicate to declare victory.

**Reply:** the exit condition, iterations run, what landed, what was discarded, final predicate state.
