import type { Box, Level, Point, Prop, Role, Wind } from "./types.ts"

const ROLES: Role[] = ["platform", "hazard", "coin", "bouncy", "wind", "exit", "decor"]
const WINDS: Wind[] = ["left", "right", "up", "down"]
const DEPTHS = ["wall", "back", "middle", "front", "closest"]

// Raw Gemma JSON: untrusted, validated field by field below.
type RawProp = { label?: unknown; role?: unknown; box?: unknown; layer?: unknown; depth?: unknown; surface?: unknown; wind?: unknown; outline?: unknown }

const clamp = (n: number) => Math.min(1, Math.max(0, n))
const arePoints = (v: unknown): v is number[][] => Array.isArray(v) && v.every((point) => isNumbers(point, 2))
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
  if (!arePoints(surface) || surface.length !== 2) return [[x0, y0], [x1, y0]]
  const [a, b] = surface.map((point) => point.map(clamp) as Point).toSorted((p, q) => p[0] - q[0])
  const nearTop = [a, b].every(([, y]) => y <= y0 + (y1 - y0) / 2)
  const gentle = Math.abs(b[1] - a[1]) <= b[0] - a[0]
  return nearTop && gentle ? [a, b] : [[x0, y0], [x1, y0]]
}

function toOutline(outline: unknown, [x0, y0, x1, y1]: Box): Point[] {
  return arePoints(outline) && outline.length >= 3 ? outline.map((point) => point.map(clamp) as Point) : [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
}

function toProp({ label, role, box, layer, depth, surface, wind, outline }: RawProp): Prop | null {
  const cleanBox = toBox(box)
  if (!ROLES.includes(role as Role) || !cleanBox) return null
  const prop: Prop = {
    label: String(label ?? role),
    role: role as Role,
    box: cleanBox,
    layer: DEPTHS.includes(depth as string) ? DEPTHS.indexOf(depth as string) : Math.round(Number(layer)) || 0,
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
const COORDS = "integers 0..1000, origin top-left, y before x"

const OBJECTS_PROMPT = `List every distinct physical object in this photo.
Include furniture (desks, tables, shelves, cabinets), screens (monitors, laptops), chairs, bags, boxes, bottles, mugs, mice, keyboards, phones, boards and posters on the wall, lights, fans, windows, doors, curtains and people.
Count every copy separately and name copies by position ("left monitor", "middle monitor", "right monitor").
Include objects cut off by the photo's edges ("chair cut off at bottom").
Skip walls, floor, ceiling and cables.
Reply with a JSON array of strings, JSON only.`

const boxesPrompt = (labels: string[]) => `Detect each of these objects in the photo:
${labels.join("\n")}

Reply with a JSON array in the same order: [{"label": "<as given>", "box_2d": [y0, x0, y1, x1]}].
box_2d is the tight box around the whole visible object, ${COORDS}.
A desk's box runs from the top of its back panel down to the bottom of its legs. A chair's box covers backrest, seat and base.
JSON only.`

const depthPrompt = (listing: string) => `These objects were found in the photo (id: label [y0, x0, y1, x1]):
${listing}

Give each one a depth: how far it really is from the camera, from far to near:
- wall: the back wall and everything flat on it (whiteboards, notice boards, switches, sockets, curtains, windows).
- back: things standing against the back wall, and items at the back of a desktop (monitors, bottles).
- middle: a desk itself (judged by its front edge) and items lying near its front (laptops, mice, keyboards, boxes).
- front: things between the furniture and the camera, like chairs pulled up to a desk.
- closest: the nearest things, usually cut off by the bottom or side of the photo.
Judge by where the object physically sits, never by how high it is in the photo:
- If A hides part of B, A is nearer than B. This beats every other clue.
- For things on the floor, compare where their feet touch the floor: lower in the photo is nearer.
- A CPU or bin under or beside a desk is never nearer than the desk's front edge.
- Of two copies of the same thing, the bigger one is nearer.
Reply with a JSON object {"<id>": "wall|back|middle|front|closest"}, JSON only.`

const rolesPrompt = (listing: string) => `These objects were found in the photo (id: label [y0, x0, y1, x1] depth):
${listing}

The photo becomes a 2D side-view platformer level. Give each object one role:
- platform: anything with a top a tiny figure could stand on: desks, tables, shelves, cabinets, monitors, laptops, chairs, bags, boxes, stacked books, window sills.
- exit: exactly one. A ceiling light, tube light or lamp; if there is none, a small object high up in the photo.
- coin: small things worth collecting: mice, phones, mugs, bottles.
- hazard: a few dangerous-looking small things (cans, scissors, a tangle of cables); at most a third of the small things.
- bouncy: soft things: cushions, pillows, balls.
- wind: fans, air conditioners.
- decor: everything else (people, boards on the wall, curtains, doors, windows).
Reply with a JSON object {"<id>": "platform|exit|coin|hazard|bouncy|wind|decor"}, JSON only.`

const edgesPrompt = (listing: string) => `These objects are platforms in a 2D side-view platformer (id: label [y0, x0, y1, x1]):
${listing}

For each, which edge does a tiny figure stand on?
- "top": the top of its box is the walkable edge: monitors, laptop screens, chair backrests, bags, boxes, bottles.
- "front": furniture whose top face we look down on: the walkable edge is the front edge of that top face, the one nearest the camera, lower in the photo than the box's top.
Desks, tables, counters, shelves and cabinets are ALWAYS "front", even when a back panel or monitors stand on them.
Reply with a JSON object {"<id>": "top|front"}, JSON only.`

const frontPrompt = (listing: string) => `Detect the front edge of the top face of each of these objects (id: label [y0, x0, y1, x1]):
${listing}

The front edge is the long edge nearest the camera that a tiny figure would stand on; not the back edge against the wall, not a back panel or shelf above it.
Reply with a JSON object {"<id>": [y0, x0, y1, x1]}: a thin box hugging that edge, ${COORDS}. JSON only.`

const namePrompt = (labels: string[]) => `This photo becomes a platformer level with these objects: ${labels.join(", ")}.
Give it a short funny title in lowercase. Reply with a JSON object {"name": "<title>"}, JSON only.`

type GeminiReply = { candidates: { content: { parts: { text: string; thought?: boolean }[] } }[] }
export type Step = { title: string; prompt: string; reply: string; ms: number }

export async function askGemma(jpegBytes: ArrayBuffer, prompt: string): Promise<string> {
  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: "image/jpeg", data: Buffer.from(jpegBytes).toString("base64") } },
        { text: prompt },
      ]
    }],
    generationConfig: { thinkingConfig: { thinkingLevel: "minimal" } },
  }
  let res: Response
  // Gemma's API now and then answers 500 or 429; a retry usually goes through
  for (let attempt = 1; ; attempt++) {
    res = await fetch(MODEL_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
      body: JSON.stringify(body),
    })
    if (res.ok) break
    if (attempt === 3 || (res.status < 500 && res.status !== 429)) throw new Error(`Gemma ${res.status}: ${await res.text()}`)
    await Bun.sleep(1000 * attempt)
  }
  const { candidates } = (await res.json()) as GeminiReply
  return candidates[0].content.parts.filter((part) => !part.thought).map((part) => part.text).join("")
}

const jsonIn = (reply: string): unknown => JSON.parse(reply.slice(reply.search(/[[{]/), Math.max(reply.lastIndexOf("}"), reply.lastIndexOf("]")) + 1))
const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const asMap = (v: unknown) => (v && typeof v === "object" ? v : {}) as Record<string, unknown>

// One Gemma call per question, each fed the answers before it; onStep sees every call
const asker = (jpegBytes: ArrayBuffer, onStep: (step: Step) => void) => async (title: string, prompt: string) => {
  const started = performance.now()
  const reply = await askGemma(jpegBytes, prompt)
  onStep({ title, prompt, reply, ms: Math.round(performance.now() - started) })
  return jsonIn(reply)
}

export async function readLevel(jpegBytes: ArrayBuffer, onStep = (_: Step) => {}): Promise<Level> {
  const ask = asker(jpegBytes, onStep)
  const labels = [...new Set(asList(await ask("1. objects", OBJECTS_PROMPT)).filter((label) => typeof label === "string"))]
  const boxes = asList(await ask("2. boxes", boxesPrompt(labels))).map(asMap)
  const found = labels
    .map((label, i) => ({ label, box_2d: (boxes.find((box) => box.label === label) ?? boxes[i])?.box_2d }))
    .filter((prop) => isNumbers(prop.box_2d, 4))
  const listing = (ids: number[], extra = (_: number) => "") =>
    ids.map((id) => `${id}: ${found[id].label} ${JSON.stringify(found[id].box_2d)}${extra(id)}`).join("\n")
  const all = found.map((_, id) => id)

  const depths = asMap(await ask("3. depth", depthPrompt(listing(all))))
  const roles = asMap(await ask("4. roles", rolesPrompt(listing(all, (id) => ` ${depths[id]}`))))
  const platforms = all.filter((id) => roles[id] === "platform")
  const edges = platforms.length ? asMap(await ask("5. edges", edgesPrompt(listing(platforms)))) : {}
  const fronts = platforms.filter((id) => edges[id] === "front")
  const frontBoxes = fronts.length ? asMap(await ask("6. front edges", frontPrompt(listing(fronts)))) : {}
  const { name } = asMap(await ask("7. name", namePrompt(labels)))

  // shortcut: front-edge Surfaces are flat (top of the edge box), no slant; ticket 04 snaps them to real edges
  const surfaceOf = (box: unknown) => (isNumbers(box, 4) ? [[box[0], box[1]], [box[0], box[3]]] : undefined)
  // A desk's box starts at its back edge or back panel: a ledge on the wall Layer, behind whatever stands on the desk
  const backEdges = fronts
    .filter((id) => isNumbers(frontBoxes[id], 4) && frontBoxes[id][0] - (found[id].box_2d as number[])[0] > 20)
    .map((id) => {
      const [y0, x0, , x1] = found[id].box_2d as number[]
      return { label: `${found[id].label} back edge`, role: "platform", depth: "wall", box_2d: [y0, x0, y0 + 10, x1] }
    })
  return levelFrom({
    name,
    // Furniture we stand on at its front edge sits on the wall Layer, so all it carries is nearer and hides the Runner
    props: [
      ...found.map((prop, id) => ({ ...prop, depth: fronts.includes(id) ? "wall" : depths[id], role: roles[id], surface: surfaceOf(frontBoxes[id]) })),
      ...backEdges,
    ],
  })
}

const reviewPrompt = (listing: string) => `This is the photo with a platformer level drawn on top, for review.
Every object has a thin rectangle (its box) labelled "<id> <label> L<layer>"; platforms also have a thick line, the surface a tiny figure stands on.
Layers: L0 = wall (farthest), L1 = back, L2 = middle, L3 = front, L4 = closest. Desks and tables are on L0 on purpose; keep them there.
The same objects as data (id: label role depth box_2d [y0, x0, y1, x1] surface [[y, x], [y, x]]):
${listing}

Fix mistakes only, mostly small coordinate tweaks:
- a box that does not tightly fit its real object: give a corrected box_2d.
- a surface that is not ON the real walkable edge (a desk's front edge, a monitor's top edge): give a corrected surface, left point then right point.
- a wrong depth (if A hides part of B, A is nearer) or a wrong role.
- an object that is not really there: "remove": true.
Coords are ${COORDS}. Leave correct objects out.
Reply with a JSON array, JSON only: [{"id": <id>, "box_2d": [...], "surface": [[y, x], [y, x]], "depth": "wall|back|middle|front|closest", "role": "...", "remove": true}], each field only when it changes. Reply [] if nothing needs fixing.`

const yx = ([x, y]: Point) => [y, x].map((n) => Math.round(n * 1000))
const rawOf = ({ label, role, box, layer, surface, wind }: Prop) =>
  ({ label, role, layer, wind, box_2d: [box[1], box[0], box[3], box[2]].map((n) => Math.round(n * 1000)), surface: surface?.map(yx) })
const FIXABLE = ["box_2d", "surface", "depth", "role"]

export function applyFixes(level: Level, fixes: unknown): Level {
  const byId = new Map(asList(fixes).map(asMap).map((fix) => [Number(fix.id), fix]))
  const props = level.props.flatMap((prop, id) => {
    const fix = byId.get(id) ?? {}
    if (fix.remove === true) return []
    const changes = Object.fromEntries(FIXABLE.filter((key) => key in fix).map((key) => [key, fix[key]]))
    const boxTop = prop.surface?.every(([, y]) => y === prop.box[1])
    // a moved box drops a Surface that was only its old top, so the new top is used
    const surface = "box_2d" in changes && !("surface" in changes) && boxTop ? undefined : rawOf(prop).surface
    return [{ ...rawOf(prop), surface, ...changes }]
  })
  return levelFrom({ name: level.name, props })
}

export async function reviewLevel(overlayJpeg: ArrayBuffer, level: Level, onStep = (_: Step) => {}): Promise<Level> {
  const listing = level.props.map((prop, id) => {
    const { label, role, box_2d, surface } = rawOf(prop)
    return `${id}: ${label} ${role} ${DEPTHS[prop.layer] ?? prop.layer} ${JSON.stringify(box_2d)}${surface ? ` ${JSON.stringify(surface)}` : ""}`
  })
  return applyFixes(level, await asker(overlayJpeg, onStep)("8. review", reviewPrompt(listing.join("\n"))))
}

// Gemma sometimes replies with an array of one-prop Levels, labelling each Prop by its Role and putting the real Label in "name"
function unwrap(item: Record<string, unknown>): Record<string, unknown>[] {
  if (!Array.isArray(item?.props)) return [item]
  return item.props.map((prop) => ({ ...prop, label: prop.label && prop.label !== prop.role ? prop.label : item.name }))
}

export function parseLevel(reply: string): Level {
  const json = jsonIn(reply)
  return levelFrom(Array.isArray(json) ? { props: json.flatMap(unwrap) } : asMap(json))
}

function levelFrom(level: Record<string, unknown>): Level {
  const props = (Array.isArray(level.props) ? (level.props as Record<string, unknown>[]) : [])
    .map((prop) => toProp({ ...prop, box: boxFrom(prop.box_2d), surface: pointsFrom(prop.surface), outline: pointsFrom(prop.outline) }))
    .filter((prop) => prop !== null)
  return { name: String(level.name ?? "Untitled Level"), props: oneExit(props) }
}
