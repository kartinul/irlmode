# 05: Layers (z-index)

**What to build:** Where Props overlap, the nearer Layer wins: a Surface behind a nearer Prop is cut there. The Runner takes the Layer of the Surface it stands on and is drawn behind nearer Props (soft-edged crop of the Snap).

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Desk Surface is interrupted where the bottle stands in front of it
- [ ] Runner visibly passes behind a nearer Prop; crop edges are feathered, not a hard rectangle
- [ ] Scripted run + screenshots reviewed
- [ ] Cut-first if it looks bad: drawing order only; overlap priority stays

## Comments

2026-10-27: changed by the user. The Runner no longer takes the Layer of the Surface underfoot: it spawns in the middle Layer, stands only on Surfaces of its own Layer, and Q/E step it one Layer back/front (it then falls onto the new Layer). S drops through the Surface underfoot. Props nearer than the Runner's Layer hide it inside their Outline (hard edge, no feathering yet).
