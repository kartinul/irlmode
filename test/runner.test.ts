import { expect, test } from "bun:test"
import type { Box, Level, Point } from "../src/types.ts"
import { centerLayer, spawn, step, type Input, type Runner } from "../public/runner.ts"

const aspect = 2
const empty: Level = { name: "empty", props: [] }
const run = (runner: Runner, level: Level, frames: number, input: Input = {}) => {
  for (let i = 0; i < frames; i++) runner = step(runner, i === 0 ? input : { ...input, jump: false, drop: false, back: false, front: false }, level, aspect)
  return runner
}

test("bottom of the Snap is the floor", () => {
  const runner = run({ ...spawn(aspect), y: 0.5, grounded: false }, empty, 120)
  expect(runner.y).toBe(1)
  expect(runner.grounded).toBe(true)
})

const shelf = (surface: [Point, Point]): Level => ({ name: "shelf", props: [{ label: "shelf", role: "platform", box: [0, 0, 1, 1], layer: 0, surface }] })

test("Surfaces are one-way: jump up through from below, land on top", () => {
  const level = shelf([[0, 0.8], [1, 0.8]])
  const rising = run({ ...spawn(aspect), x: 0.5 }, level, 15, { jump: true })
  expect(rising.y).toBeLessThan(0.8)
  expect(rising.grounded).toBe(false)
  const landed = run(rising, level, 120)
  expect(landed.y).toBeCloseTo(0.8)
  expect(landed.grounded).toBe(true)
})

test("slanted Surfaces are walkable", () => {
  const level = shelf([[0, 0.9], [1, 0.5]])
  let runner = run({ ...spawn(aspect), x: 0.1, y: 0.86 }, level, 1)
  for (let i = 0; i < 60; i++) {
    runner = step(runner, { right: true }, level, aspect)
    expect(runner.grounded).toBe(true)
  }
  expect(runner.x).toBeGreaterThan(0.3)
  expect(runner.y).toBeCloseTo(0.9 - 0.4 * runner.x)
})

test("double jump is always available, triple is not", () => {
  const apex = run(spawn(aspect), empty, 20, { jump: true })
  const second = step(apex, { jump: true }, empty, aspect)
  expect(second.vy).toBeLessThan(0)
  const third = step(second, { jump: true }, empty, aspect)
  expect(third.vy).toBeGreaterThan(second.vy)
})

test("touching the exit wins and freezes the Runner", () => {
  const level: Level = { name: "exit", props: [{ label: "jug", role: "exit", box: [0.2, 0.9, 0.3, 1], layer: 0 }] }
  const runner = run(spawn(aspect), level, 60, { right: true })
  expect(runner.won).toBe(true)
  expect(step(runner, { right: true }, level, aspect)).toBe(runner)
})

const plank = (layer: number, y: number) => ({ label: `plank ${layer}`, role: "platform" as const, box: [0, y, 1, 1] as Box, layer, surface: [[0, y], [1, y]] as [Point, Point] })
const stacked: Level = { name: "stack", props: [plank(0, 0.6), plank(2, 0.8), plank(5, 0.9)] }

test("the Runner starts in the middle Layer and only stands on its own Layer", () => {
  expect(centerLayer(stacked)).toBe(2)
  const runner = run({ ...spawn(aspect, 2), x: 0.5, y: 0.3, grounded: false }, stacked, 120)
  expect(runner.y).toBeCloseTo(0.8)
})

test("S drops through the Surface underfoot but not the floor", () => {
  const onPlank = run({ ...spawn(aspect, 2), x: 0.5, y: 0.8 }, stacked, 1)
  expect(onPlank.y).toBeCloseTo(0.8)
  const dropped = run(onPlank, stacked, 120, { drop: true })
  expect(dropped.y).toBe(1)
  expect(run(dropped, stacked, 30, { drop: true }).y).toBe(1)
})

test("Q and E step to the next Layer back or front, then fall onto it", () => {
  const start = { ...spawn(aspect, 2), x: 0.5, y: 0.5, grounded: false }
  const back = run(start, stacked, 120, { back: true })
  expect([back.layer, back.y]).toEqual([0, 0.6])
  const front = run(start, stacked, 120, { front: true })
  expect(front.layer).toBe(5)
  expect(front.y).toBeCloseTo(0.9)
  expect(run({ ...start, layer: 5 }, stacked, 1, { front: true }).layer).toBe(5)
})
