import type { Box, Level, Point, Prop, Role, Wind } from "./types.ts"

const ROLES: Role[] = ["platform", "hazard", "coin", "bouncy", "wind", "exit", "decor"]
const WINDS: Wind[] = ["left", "right", "up", "down"]

// Raw Gemma JSON: untrusted, validated field by field below.
type RawProp = { label?: unknown; role?: unknown; box?: unknown; layer?: unknown; surface?: unknown; wind?: unknown; outline?: unknown }

const clamp = (n: number) => Math.min(1, Math.max(0, n))
const isNumbers = (v: unknown, length: number): v is number[] =>
  Array.isArray(v) && v.length === length && v.every(Number.isFinite)

function toBox(box: unknown): Box | null {
  if (!isNumbers(box, 4)) return null
  const [ax, ay, bx, by] = box.map(clamp)
  const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx)
  const y0 = Math.min(ay, by), y1 = Math.max(ay, by)
  return x1 > x0 && y1 > y0 ? [x0, y0, x1, y1] : null
}

function toSurface(surface: unknown, [x0, y0, x1, y1]: Box): [Point, Point] {
  const points = Array.isArray(surface) && surface.length === 2 && surface.every((point) => isNumbers(point, 2))
  const nearTop = points && surface.every(([, y]: number[]) => y <= y0 + (y1 - y0) / 4)
  if (!nearTop) return [[x0, y0], [x1, y0]]
  const [a, b] = (surface as Point[]).map((point) => point.map(clamp) as Point)
  return a[0] <= b[0] ? [a, b] : [b, a]
}

function toOutline(outline: unknown, [x0, y0, x1, y1]: Box): Point[] {
  const valid = Array.isArray(outline) && outline.length >= 3 && outline.every((point) => isNumbers(point, 2))
  return valid ? outline.map((point) => point.map(clamp) as Point) : [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
}

function toProp({ label, role, box, layer, surface, wind, outline }: RawProp): Prop | null {
  const cleanBox = toBox(box)
  if (!ROLES.includes(role as Role) || !cleanBox) return null
  const prop: Prop = {
    label: String(label ?? role),
    role: role as Role,
    box: cleanBox,
    layer: Math.round(Number(layer)) || 0,
    outline: toOutline(outline, cleanBox),
  }
  if (role === "platform") prop.surface = toSurface(surface, cleanBox)
  if (role === "wind") prop.wind = WINDS.includes(wind as Wind) ? (wind as Wind) : "down"
  return prop
}

const thousandths = (v: unknown) => (isNumbers(v, (v as unknown[]).length) ? v.map((n) => n / 1000) : v)
const boxFrom = (box: unknown) => { const b = thousandths(box); return isNumbers(b, 4) ? [b[1], b[0], b[3], b[2]] : b }
const pointsFrom = (points: unknown) =>
  Array.isArray(points) ? points.map((point) => { const p = thousandths(point); return Array.isArray(p) ? p.toReversed() : p }) : points

const withRole = (prop: Prop, role: Role) => toProp({ ...prop, role })!

function oneExit(props: Prop[]): Prop[] {
  const exitAt = props.findIndex((prop) => prop.role === "exit")
  if (exitAt === -1) {
    const platforms = props.filter((prop) => prop.role === "platform")
    const highest = (platforms.length ? platforms : props).toSorted((a, b) => a.box[1] - b.box[1])[0]
    return props.map((prop) => (prop === highest ? withRole(prop, "exit") : prop))
  }
  return props.map((prop, i) => (prop.role === "exit" && i !== exitAt ? withRole(prop, "platform") : prop))
}

const MODEL_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent"

const PROMPT = `This photo becomes a 2D platformer level; its real objects are the terrain.
List EVERY distinct visible object, big or small (furniture, screens, bags, bottles, people, chairs, lights, doors, windows...), and reply with ONE JSON object (not an array), JSON only:
{"name": "<simple title in lowercase>", "props": [{"label": "<plain words>", "role": "platform|hazard|coin|bouncy|wind|exit|decor", "box_2d": [y0, x0, y1, x1], "outline": [[y, x], ...], "layer": <int>, "surface": [[y, x], [y, x]], "wind": "left|right|up|down"}]}
Coords are integers 0..1000, origin top-left, y before x. box_2d is the tight box around the whole object.
outline is a polygon of 8 to 16 points tracing the object's visible silhouette, clockwise.
layer is the z-index: 0 = farthest from the camera (back wall), counting up for each step nearer; things at the same depth share a layer.
surface (platforms only) is the edge a tiny figure would stand on: the front edge of the object's top face as seen in the photo, left point then right point; it may slant.
wind only for wind props. Exactly one exit, a small reachable object. Use big flat things as platforms, small objects as coins or hazards.
Anything that is not part of the game (people, walls, background clutter) is decor.`

type GeminiReply = { candidates: { content: { parts: { text: string; thought?: boolean }[] } }[] }

export async function readLevel(jpegBytes: ArrayBuffer): Promise<Level> {
  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: "image/jpeg", data: Buffer.from(jpegBytes).toString("base64") } },
        { text: PROMPT },
      ]
    }],
    generationConfig: { thinkingConfig: { thinkingLevel: "minimal" } },
  }
  const res = await fetch(MODEL_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Gemma ${res.status}: ${await res.text()}`)
  const { candidates } = (await res.json()) as GeminiReply
  return parseLevel(candidates[0].content.parts.filter((part) => !part.thought).map((part) => part.text).join(""))
}

// Gemma sometimes replies with an array of one-prop Levels, labelling each Prop by its Role and putting the real Label in "name"
function unwrap(item: Record<string, unknown>): Record<string, unknown>[] {
  if (!Array.isArray(item?.props)) return [item]
  return item.props.map((prop) => ({ ...prop, label: prop.label && prop.label !== prop.role ? prop.label : item.name }))
}

export function parseLevel(reply: string): Level {
  const json = JSON.parse(reply.slice(reply.search(/[[{]/), Math.max(reply.lastIndexOf("}"), reply.lastIndexOf("]")) + 1))
  const level = Array.isArray(json) ? { props: json.flatMap(unwrap) } : json
  const props = (Array.isArray(level.props) ? (level.props as Record<string, unknown>[]) : [])
    .map((prop) => toProp({ ...prop, box: boxFrom(prop.box_2d), surface: pointsFrom(prop.surface), outline: pointsFrom(prop.outline) }))
    .filter((prop) => prop !== null)
  return { name: String(level.name ?? "Untitled Level"), props: oneExit(props) }
}
