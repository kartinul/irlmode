import { expect, test } from "bun:test"
import { applyFixes, askGemma, parseLevel, readLevel } from "./level.ts"

type Fake = { label: string; role: string; box: unknown; layer: number; surface?: number[][]; wind?: string }

const toYx = (point: number[]) => point.map((n) => Math.round(n * 1000)).toReversed()
const raw = ({ box, surface, ...prop }: Fake) => ({
  ...prop,
  box_2d: Array.isArray(box) ? ([box[1], box[0], box[3], box[2]] as number[]).map((n) => Math.round(n * 1000)) : box,
  ...(surface && { surface: surface.map(toYx) }),
})

test("parses a fenced reply into a Level", () => {
  const reply = '```json\n{"name":"Desk","props":[{"label":"desk","role":"platform","box_2d":[400,0,1000,800],"layer":1,"surface":[[420,0],[500,800]],"outline":[[400,0],[400,800],[1000,400]]},{"label":"jug","role":"exit","box_2d":[300,200,400,300],"layer":0}]}\n```'
  expect(parseLevel(reply)).toEqual({
    name: "Desk",
    props: [
      { label: "desk", role: "platform", box: [0, 0.4, 0.8, 1], layer: 1, surface: [[0, 0.42], [0.8, 0.5]], outline: [[0, 0.4], [0.8, 0.4], [0.4, 1]] },
      { label: "jug", role: "exit", box: [0.2, 0.3, 0.3, 0.4], layer: 0, outline: [[0.2, 0.3], [0.3, 0.3], [0.3, 0.4], [0.2, 0.4]] },
    ],
  })
})

const exit: Fake = { label: "jug", role: "exit", box: [0.2, 0.3, 0.3, 0.4], layer: 0 }
const level = (...props: Fake[]) => JSON.stringify({ name: "L", props: [...props, exit].map(raw) })

test("drops Props with junk Roles or unusable Boxes", () => {
  const reply = level(
    { label: "ghost", role: "enemy", box: [0, 0, 0.5, 0.5], layer: 0 },
    { label: "nothing", role: "coin", box: [0.5, 0.5, 0.5, 0.9], layer: 0 },
    { label: "broken", role: "coin", box: "oops", layer: 0 },
  )
  expect<unknown>(parseLevel(reply).props).toMatchObject([exit])
})

test("clamps out-of-range coords and orders Box corners", () => {
  const reply = level(
    { label: "desk", role: "platform", box: [-0.1, 1.2, 0.9, 0.4], layer: 1, surface: [[1.3, 0.5], [-2, 0.4]] },
  )
  expect(parseLevel(reply).props[0]).toMatchObject(
    { label: "desk", role: "platform", box: [0, 0.4, 0.9, 1], layer: 1, surface: [[0, 0.4], [1, 0.5]] },
  )
})

test("gives a platform without a Surface its Box top, and wind a direction", () => {
  const reply = level(
    { label: "shelf", role: "platform", box: [0.1, 0.2, 0.3, 0.4], layer: 0 },
    { label: "fan", role: "wind", box: [0.8, 0, 0.9, 0.1], layer: 0, wind: "sideways" },
  )
  const [shelf, fan] = parseLevel(reply).props
  expect(shelf.surface).toEqual([[0.1, 0.2], [0.3, 0.2]])
  expect(fan.wind).toBe("down")
})

const roles = (props: { label: string; role: string }[]) => props.map(({ label, role }) => `${label}:${role}`)

test("extra exits become platforms", () => {
  const reply = level({ label: "door", role: "exit", box: [0.6, 0.1, 0.7, 0.5], layer: 0 })
  const { props } = parseLevel(reply)
  expect(roles(props)).toEqual(["door:exit", "jug:platform"])
  expect(props[1].surface).toEqual([[0.2, 0.3], [0.3, 0.3]])
})

test("with no exit, the highest platform is promoted", () => {
  const reply = JSON.stringify({ name: "L", props: (<Fake[]>[
    { label: "desk", role: "platform", box: [0, 0.5, 1, 1], layer: 1, surface: [[0, 0.5], [1, 0.6]] },
    { label: "shelf", role: "platform", box: [0.1, 0.2, 0.3, 0.4], layer: 0 },
  ]).map(raw) })
  const { props } = parseLevel(reply)
  expect(roles(props)).toEqual(["desk:platform", "shelf:exit"])
  expect(props[1].surface).toBeUndefined()
})

test("a Surface far below its Box top falls back to the Box top", () => {
  const reply = level(
    { label: "monitor", role: "platform", box: [0.3, 0.2, 0.6, 0.8], layer: 1, surface: [[0.3, 0.2], [0.6, 0.8]] },
  )
  expect(parseLevel(reply).props[0].surface).toEqual([[0.3, 0.2], [0.6, 0.2]])
})

test("decor Props are kept, and junk outlines fall back to the Box", () => {
  const reply = level({ label: "person", role: "decor", box: [0.8, 0, 1, 1], layer: 5 })
  const person = JSON.parse(reply)
  person.props[0].outline = [[0, 800], "oops"]
  expect(parseLevel(JSON.stringify(person)).props[0]).toMatchObject(
    { role: "decor", layer: 5, outline: [[0.8, 0], [1, 0], [1, 1], [0.8, 1]] },
  )
})

test("an array of one-prop Levels is flattened into one Level", () => {
  const reply = '```json\n[{"name":"desk","props":[{"label":"platform","role":"platform","box_2d":[400,0,1000,800],"layer":1}]},{"name":"jug","props":[{"label":"big jug","role":"exit","box_2d":[300,200,400,300],"layer":0}]}]\n```'
  const level = parseLevel(reply)
  expect(level.name).toBe("Untitled Level")
  expect(roles(level.props)).toEqual(["desk:platform", "big jug:exit"])
})

test("a steep Surface falls back to the Box top", () => {
  const reply = level(
    { label: "monitor", role: "platform", box: [0.3, 0.2, 0.6, 0.8], layer: 1, surface: [[0.3, 0.2], [0.31, 0.3]] },
  )
  expect(parseLevel(reply).props[0].surface).toEqual([[0.3, 0.2], [0.6, 0.2]])
})

test("a named depth band becomes the Layer, junk falls back to layer", () => {
  const reply = JSON.stringify({ name: "L", props: [
    { label: "chair", role: "platform", box_2d: [500, 100, 900, 400], depth: "front" },
    { label: "board", role: "decor", box_2d: [0, 0, 300, 500], depth: "far away", layer: 2 },
  ] })
  expect(parseLevel(reply).props.map((prop) => prop.layer)).toEqual([3, 2])
})

test("the step chain feeds each answer forward and builds the Level", async () => {
  const replies = [
    '["desk", "monitor", "lamp"]',
    '```json\n[{"label": "desk", "box_2d": [400, 0, 1000, 800]}, {"label": "monitor", "box_2d": [100, 200, 380, 500]}, {"label": "lamp", "box_2d": [0, 900, 50, 950]}]\n```',
    '{"0": "middle", "1": "back", "2": "wall"}',
    '{"0": "platform", "1": "platform", "2": "exit"}',
    '{"0": "front", "1": "top"}',
    '{"0": [600, 0, 620, 800]}',
    '{"name": "lamp quest"}',
  ]
  const prompts: string[] = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (_: string, init: RequestInit) => {
    prompts.push(JSON.parse(String(init.body)).contents[0].parts[1].text)
    return Response.json({ candidates: [{ content: { parts: [{ text: replies[prompts.length - 1] }] } }] })
  }) as typeof fetch
  try {
    const steps: string[] = []
    const level = await readLevel(new ArrayBuffer(1), (step) => steps.push(step.title))
    expect(steps).toHaveLength(7)
    expect(prompts[3]).toContain("0: desk [400,0,1000,800] middle")
    expect(prompts[5]).toContain("0: desk")
    expect(prompts[5]).not.toContain("monitor")
    expect(level.name).toBe("lamp quest")
    expect(level.props.map(({ label, role, layer, surface }) => ({ label, role, layer, surface }))).toEqual([
      { label: "desk", role: "platform", layer: 0, surface: [[0, 0.6], [0.8, 0.6]] },
      { label: "monitor", role: "platform", layer: 1, surface: [[0.2, 0.1], [0.5, 0.1]] },
      { label: "lamp", role: "exit", layer: 0, surface: undefined },
      { label: "desk back edge", role: "platform", layer: 0, surface: [[0, 0.4], [0.8, 0.4]] },
    ])
  } finally {
    globalThis.fetch = realFetch
  }
})

test("askGemma retries a 500 and gives up on a 400", async () => {
  const statuses = [500, 200, 400]
  const realFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    const status = statuses.shift()!
    return status === 200 ? Response.json({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }) : new Response("nope", { status })
  }) as unknown as typeof fetch
  try {
    expect(await askGemma(new ArrayBuffer(1), "hi")).toBe("ok")
    await expect(askGemma(new ArrayBuffer(1), "hi")).rejects.toThrow("Gemma 400")
  } finally {
    globalThis.fetch = realFetch
  }
})

test("review fixes move boxes and Surfaces, change depth, remove ghosts, ignore junk", () => {
  const draft = parseLevel(level(
    { label: "desk", role: "platform", box: [0, 0.4, 0.8, 1], layer: 0, surface: [[0, 0.6], [0.8, 0.6]] },
    { label: "monitor", role: "platform", box: [0.2, 0.1, 0.5, 0.38], layer: 1 },
    { label: "ghost", role: "coin", box: [0.9, 0.9, 0.95, 0.95], layer: 2 },
  ))
  const fixed = applyFixes(draft, [
    { id: 0, surface: [[580, 0], [590, 800]] },
    { id: 1, box_2d: [120, 200, 400, 500], depth: "middle", label: "hacked" },
    { id: 2, remove: true },
    { id: 9, role: "exit" },
    "junk",
  ])
  expect(fixed.props.map(({ label, layer, box, surface }) => ({ label, layer, box, surface }))).toEqual([
    { label: "desk", layer: 0, box: [0, 0.4, 0.8, 1], surface: [[0, 0.58], [0.8, 0.59]] },
    { label: "monitor", layer: 2, box: [0.2, 0.12, 0.5, 0.4], surface: [[0.2, 0.12], [0.5, 0.12]] },
    { label: "jug", layer: 0, box: [0.2, 0.3, 0.3, 0.4], surface: undefined },
  ])
})
