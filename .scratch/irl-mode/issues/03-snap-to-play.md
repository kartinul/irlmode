# 03: Snap → play, end to end (local)

**What to build:** On a locally served page, the player takes or picks a photo, sees a loading state, then a title card with the Level Name, then plays the Level built from that Snap. The API key stays on the local server.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] Camera opens on phone via file input; photo resized in browser before upload
- [ ] Local server serves the game and a level endpoint that calls Gemma
- [x] Gemma failure shows a friendly retry, never a blank screen
- [x] Harness uploads the desk Snap, waits for the title card, plays to the exit; screenshots reviewed
- [ ] Snap → playable in ≤ 10 s

## Comments

- Scope change (user): camera/file input deferred. The page always plays the demo Snap `fixtures/desk.jpg`; `GET /level` runs Gemma on it server-side (key never leaves the server). "Camera opens on phone" stays unticked: deferred by the user. Harness therefore opens the page instead of uploading.
- Run: `bun start`, open `http://localhost:3000/`. Fake Gemma: `FAKE_GEMMA=fixtures/desk.level.json bun start` (that Level after 1.5 s) or `FAKE_GEMMA=fail bun start` (502 → "Try again" card). `?fixture=desk` still skips Gemma entirely.
- Harness: `bun run snap` (fake Gemma; first `/level` is forced to 502 to show the retry card, then Try again → loading → title → plays to the exit via `harness/route.ts`, shared with `bun run play`). `bun run snap --live` uses real Gemma and prints Snap → playable time. Shots `harness/shots/snap-{error,loading,title,mid-climb,win}.png` reviewed (fake Gemma only).
- Server `idleTimeout: 60` because Bun's 10 s default would cut a ~15 s Gemma call.
- Tests: `test/server.test.ts` covers the endpoint with both fake modes.
- **Not verified here (no network):** "Local server ... calls Gemma" and "≤ 10 s" need the live run (`bun run snap --live`). Real Gemma is ~15 s, so ≤ 10 s is likely unmet.
