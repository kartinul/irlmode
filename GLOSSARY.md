# IRL Mode

A photo of the real world becomes a playable 2D platformer level, with the photo's own objects as the terrain.

## Language

**Snap**:
The photo the player takes; it stays as the level's background.
_Avoid_: image, picture, upload

**Level**:
A Snap plus everything Gemma read from it: a Level Name and its Props.
_Avoid_: map, stage, world

**Level Name**:
The funny title Gemma gives a Level.

**Prop**:
One real object in the Snap that takes part in the game, with a Label, a Box and a Role.
_Avoid_: object, thing, item, entity

**Label**:
What the Prop really is, in plain words ("water bottle").

**Box**:
The rectangle in the Snap that a Prop occupies.
_Avoid_: bbox, rect

**Surface**:
The real edge in the Snap a Runner can stand on, such as a desk's front edge or a monitor's top; it may slant.
_Avoid_: ledge, top, floor

**Layer**:
A Prop's z-index in the Snap: how close it is to the camera relative to the other Props. Nearer Layers win where Props overlap.
_Avoid_: depth, z, distance

**Outline**:
The polygon tracing a Prop's real silhouette in the Snap; nearer Props hide the Runner exactly inside it.
_Avoid_: mask, shape

**Role**:
How a Prop behaves in the game: platform, hazard, coin, bouncy, wind, exit, or decor (only hides the Runner).
_Avoid_: type, kind, category

**Runner**:
The character the player controls.
_Avoid_: player sprite, hero, avatar

**Spawn**:
Where the Runner starts and returns after touching a hazard: the bottom-left of the Level.
