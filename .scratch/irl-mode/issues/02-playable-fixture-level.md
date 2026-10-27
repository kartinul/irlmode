# 02: Playable level from the desk fixture + play harness

**What to build:** Opening the game with the desk fixture shows the Snap full screen (landscape) and a Runner at Spawn (bottom-left) who can run, jump and double jump along real (possibly slanted) Surfaces and win by reaching the exit. A scripted headless run proves it and saves screenshots.

**Blocked by:** 01

**Status:** resolved

- [x] Surfaces are one-way: land from above, jump up through from below
- [x] Slanted Surfaces are walkable
- [x] Double jump always available
- [x] Bottom of the Snap is the floor
- [x] Game exposes read-only state (Runner position, grounded, won, Level) for tests
- [x] Scripted run (keyboard) reaches the exit on the desk fixture; screenshots at spawn, mid-climb, win reviewed

## Comments

- Run: `bun start`, open `http://localhost:3000/?fixture=desk`. Harness: `bun run play` (shots in `harness/shots/`). Unit tests: `bun test`.
- Verified on the placeholder fixture only; ticket 01 had not landed at merge time. The harness route (double jump onto the desk, walk to the exit, jump) may need retuning on the real Gemma fixture.
- No `bun.lock`: the registry was unreachable, so playwright 1.63.0 (matches cached chromium-1243) was copied into `node_modules` by hand. Run `bun install` once online to create the lockfile.

- Verified on the real Gemma desk fixture after merge: JUMP_SPEED 1.35 → 1.5 so a double jump clears the desk Surface (0.58 of Snap height); harness holds Right until landing and accepts an early win. Wins 3/3; screenshots reviewed.
