# 0001: Level JSON shape

All coords are fractions of the Snap (0..1, origin top-left), so a Level works at any display size.

```json
{
  "name": "The Desk of Mild Peril",
  "props": [
    { "label": "desk", "role": "platform", "box": [0.07, 0.40, 0.85, 1], "layer": 1,
      "surface": [[0.07, 0.42], [0.85, 0.62]] },
    { "label": "water bottle", "role": "hazard", "box": [0.34, 0.35, 0.43, 0.93], "layer": 3 },
    { "label": "ceiling fan", "role": "wind", "box": [0.86, 0.02, 0.98, 0.1], "layer": 0, "wind": "down" }
  ]
}
```

- `box`: `[x0, y0, x1, y1]`
- `role`: `platform | hazard | coin | bouncy | wind | exit | decor` (exactly one `exit`; `decor` only hides the Runner)
- `outline`: the Prop's silhouette polygon `[[x, y], ...]`; falls back to the `box` corners
- `layer`: integer z-index, 0 = farthest, higher = nearer the camera
- `surface` (platforms only): the standable edge, two points `[[x, y], [x, y]]` left to right; may slant
- `wind` (wind only): `left | right | up | down`

Spawn is not stored: it is always the bottom-left of the Snap.
