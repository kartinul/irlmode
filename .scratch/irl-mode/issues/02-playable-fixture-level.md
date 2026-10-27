# 02: Playable level from the desk fixture + play harness

**What to build:** Opening the game with the desk fixture shows the Snap full screen (landscape) and a Runner at Spawn (bottom-left) who can run, jump and double jump along real (possibly slanted) Surfaces and win by reaching the exit. A scripted headless run proves it and saves screenshots.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Surfaces are one-way: land from above, jump up through from below
- [ ] Slanted Surfaces are walkable
- [ ] Double jump always available
- [ ] Bottom of the Snap is the floor
- [ ] Game exposes read-only state (Runner position, grounded, won, Level) for tests
- [ ] Scripted run (keyboard) reaches the exit on the desk fixture; screenshots at spawn, mid-climb, win reviewed
