# 03: Snap → play, end to end (local)

**What to build:** On a locally served page, the player takes or picks a photo, sees a loading state, then a title card with the Level Name, then plays the Level built from that Snap. The API key stays on the local server.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] Camera opens on phone via file input; photo resized in browser before upload
- [ ] Local server serves the game and a level endpoint that calls Gemma
- [ ] Gemma failure shows a friendly retry, never a blank screen
- [ ] Harness uploads the desk Snap, waits for the title card, plays to the exit; screenshots reviewed
- [ ] Snap → playable in ≤ 10 s
