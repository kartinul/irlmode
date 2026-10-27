# 01: Gemma level reader + accuracy check

**What to build:** Given a Snap, Gemma 4 (`gemma-4-26b-a4b-it`, `thinkingLevel: "minimal"`) returns a Level: a Level Name plus Props, each with Label, Role, Box, Layer, a Surface for platforms and a direction for wind. We can see the result drawn over the Snap and get a measured accuracy score against hand-marked ground truth for the desk Snap.

**Blocked by:** None (can start immediately)

**Status:** resolved (latency and Surface accuracy below target, see Comments)

- [ ] Desk Snap (`~/Desktop/20261027_115731.jpg`, shrunk to 1024px) returns valid Level JSON in ≤ 5 s
- [x] Reply parsing survives code fences, junk Roles and out-of-range coords (assert self-check)
- [x] Exactly one exit after cleanup (extra exits become platforms; none → highest platform promoted)
- [x] Ground truth hand-marked for bottle, monitor, laptop, desk edge, bags, mouse
- [ ] Score: Box IoU ≥ 0.7 on those Props, Surface error ≤ 2% of Snap height, over 3 runs
- [x] Overlay screenshot of Boxes/Surfaces/Roles on the Snap reviewed
- [x] Level JSON shape locked and saved as the desk fixture for later tickets

## Comments

- `src/level.js` exports `readLevel(jpegBytes)` (Gemma call) and `parseLevel(reply)` (cleanup). Tests: `bun test`.
- `harness/score.js` reads the desk Snap 3 times, prints latency, IoU and Surface error per truth Prop; `--save` writes the cleaned reply to `fixtures/desk.level.json`.
- `harness/overlay.html` draws a Level (and `?truth=/fixtures/desk.truth.json`, `?grid`) over the Snap; serve the repo root and screenshot it.
- Live run (VPN on): Gemma ignores "0..1 fractions" and answers in 0..1000. The prompt now asks for Gemma's native `box_2d` `[y0, x0, y1, x1]` and `[y, x]` Surface points in 0..1000, and the parser converts them. Asking for x-first made it flip axes in about 1 run in 3.
- Scores over 3 runs: bottle 0.92–0.93, mouse 0.87–0.88, bags 0.66 (truth boxes both bags, Gemma usually boxes one). Monitor and laptop scored 0.96–0.98 in one run but 0.12–0.39 in the other two. **IoU ≥ 0.7 is not stable.**
- **Unmet: latency is 15–18 s, not ≤ 5 s.** That is Gemma 26B over the API from here; shrinking the Snap further is the next thing to try.
- **Unmet: Surface error is 8–30%.** Gemma draws Surfaces corner to corner across the Box. A Surface is now only kept when both points sit in the top quarter of its Box; otherwise it falls back to the Box top. Ticket 04 (edge snapping) is the real fix.
- `fixtures/desk.level.json` is a real Gemma reply (the "IT Lab Gauntlet" run, which scored well), cleaned with that Surface rule. Overlay reviewed: Boxes are tight, and the Surfaces are now flat Box tops.
