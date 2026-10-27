# 01: Gemma level reader + accuracy check

**What to build:** Given a Snap, Gemma 4 (`gemma-4-26b-a4b-it`, `thinkingLevel: "minimal"`) returns a Level: a Level Name plus Props, each with Label, Role, Box, Layer, a Surface for platforms and a direction for wind. We can see the result drawn over the Snap and get a measured accuracy score against hand-marked ground truth for the desk Snap.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Desk Snap (`~/Desktop/20261027_115731.jpg`, shrunk to 1024px) returns valid Level JSON in ≤ 5 s
- [ ] Reply parsing survives code fences, junk Roles and out-of-range coords (assert self-check)
- [ ] Exactly one exit after cleanup (extra exits become platforms; none → highest platform promoted)
- [ ] Ground truth hand-marked for bottle, monitor, laptop, desk edge, bags, mouse
- [ ] Score: Box IoU ≥ 0.7 on those Props, Surface error ≤ 2% of Snap height, over 3 runs
- [ ] Overlay screenshot of Boxes/Surfaces/Roles on the Snap reviewed
- [ ] Level JSON shape locked and saved as the desk fixture for later tickets
