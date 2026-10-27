import { expect, test } from "bun:test"
import { spawn, step } from "../public/runner.js"

const aspect = 2
const empty = { name: "empty", props: [] }
const run = (runner, level, frames, input = {}) => {
  for (let i = 0; i < frames; i++) runner = step(runner, i === 0 ? input : { ...input, jump: false }, level, aspect)
  return runner
}

test("bottom of the Snap is the floor", () => {
  const runner = run({ ...spawn(aspect), y: 0.5, grounded: false }, empty, 120)
  expect(runner.y).toBe(1)
  expect(runner.grounded).toBe(true)
})

const shelf = surface => ({ name: "shelf", props: [{ label: "shelf", role: "platform", box: [0, 0, 1, 1], layer: 0, surface }] })

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
  const level = { name: "exit", props: [{ label: "jug", role: "exit", box: [0.2, 0.9, 0.3, 1], layer: 0 }] }
  const runner = run(spawn(aspect), level, 60, { right: true })
  expect(runner.won).toBe(true)
  expect(step(runner, { right: true }, level, aspect)).toBe(runner)
})
