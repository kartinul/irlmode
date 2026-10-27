# 05: Layers (z-index)

**What to build:** Where Props overlap, the nearer Layer wins: a Surface behind a nearer Prop is cut there. The Runner takes the Layer of the Surface it stands on and is drawn behind nearer Props (soft-edged crop of the Snap).

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Desk Surface is interrupted where the bottle stands in front of it
- [ ] Runner visibly passes behind a nearer Prop; crop edges are feathered, not a hard rectangle
- [ ] Scripted run + screenshots reviewed
- [ ] Cut-first if it looks bad: drawing order only; overlap priority stays
