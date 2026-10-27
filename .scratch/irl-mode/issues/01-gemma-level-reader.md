# 01: Gemma level reader + accuracy check

**What to build:** Given a Snap, Gemma 4 (`gemma-4-26b-a4b-it`, `thinkingLevel: "minimal"`) returns a Level: a Level Name plus Props, each with Label, Role, Box, Layer, a Surface for platforms and a direction for wind. We can see the result drawn over the Snap and get a measured accuracy score against hand-marked ground truth for the desk Snap.

**Blocked by:** None (can start immediately)

**Status:** blocked (needs a network-enabled run of `bun harness/score.js --save`)

- [ ] Desk Snap (`~/Desktop/20261027_115731.jpg`, shrunk to 1024px) returns valid Level JSON in ≤ 5 s
- [x] Reply parsing survives code fences, junk Roles and out-of-range coords (assert self-check)
- [x] Exactly one exit after cleanup (extra exits become platforms; none → highest platform promoted)
- [x] Ground truth hand-marked for bottle, monitor, laptop, desk edge, bags, mouse
- [ ] Score: Box IoU ≥ 0.7 on those Props, Surface error ≤ 2% of Snap height, over 3 runs
- [ ] Overlay screenshot of Boxes/Surfaces/Roles on the Snap reviewed
- [ ] Level JSON shape locked and saved as the desk fixture for later tickets

## Comments

- `src/level.js` exports `readLevel(jpegBytes)` (Gemma call) and `parseLevel(reply)` (cleanup). Tests: `bun test`.
- `harness/score.js` reads the desk Snap 3 times, prints latency, IoU and Surface error per truth Prop; `--save` writes the cleaned reply to `fixtures/desk.level.json`.
- `harness/overlay.html` draws a Level (and `?truth=/fixtures/desk.truth.json`, `?grid`) over the Snap; serve the repo root and screenshot it.
- The agent sandbox could not resolve `generativelanguage.googleapis.com`, so no live Gemma call was made: latency, scores, the real fixture and the Gemma overlay review are still open. `fixtures/desk.level.json` is still the hand-written placeholder (already in the ADR shape).
- Ground truth was checked on the overlay. "Desk edge" is ambiguous in this wide-angle Snap; it is marked from the desk top's back-left corner (0.085, 0.70) to its front-right corner (0.73, 0.78).
- Untried: the prompt asks for 0..1 fractions. If IoU comes in low, try Gemma's native 0..1000 `[y0, x0, y1, x1]` boxes.
