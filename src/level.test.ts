import { expect, test } from "bun:test"
import { parseLevel } from "./level.ts"

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
