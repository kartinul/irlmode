import type { Box, Level, Point } from "../src/types.ts"

export type Runner = { x: number; y: number; vx: number; vy: number; grounded: boolean; jumps: number; won: boolean; layer: number }
export type Input = { left?: boolean; right?: boolean; jump?: boolean; drop?: boolean; back?: boolean; front?: boolean }

export const SIZE = { w: 0.035, h: 0.07 }
const GRAVITY = 3
const JUMP_SPEED = 1.5
const RUN_SPEED = 0.7
const MAX_JUMPS = 2
const STICK = 0.02

export const layersOf = (level: Level) => [...new Set(level.props.map(p => p.layer))].sort((a, b) => a - b)
export const centerLayer = (level: Level) => { const layers = layersOf(level); return layers[(layers.length - 1) >> 1] ?? 0 }

export const spawn = (aspect: number, layer = 0): Runner => ({ x: SIZE.w / 2 / aspect, y: 1, vx: 0, vy: 0, grounded: true, jumps: 0, won: false, layer })

type Surface = [Point, Point]
const floor: Surface = [[0, 1], [1, 1]]
const surfaces = (level: Level, layer: number) => [floor, ...level.props.flatMap(p => (p.surface && p.layer === layer ? [p.surface] : []))]

const heightAt = ([[x0, y0], [x1, y1]]: Surface, x: number) => (x < x0 || x > x1 ? null : y0 + ((x - x0) / (x1 - x0 || 1)) * (y1 - y0))

function landing(level: Level, layer: number, x0: number, y0: number, x1: number, y1: number, grounded: boolean) {
  let best: number | null = null
  for (const surface of surfaces(level, layer)) {
    const y = heightAt(surface, x1)
    if (y === null) continue
    const wasAbove = y0 <= (heightAt(surface, x0) ?? y) + 1e-6
    const reaches = y1 >= y - (grounded ? STICK : 0)
    if (wasAbove && reaches && (best === null || y < best)) best = y
  }
  return best
}

const overlaps = (runner: Runner, [bx0, by0, bx1, by1]: Box, aspect: number) => {
  const half = SIZE.w / 2 / aspect
  return runner.x + half > bx0 && runner.x - half < bx1 && runner.y > by0 && runner.y - SIZE.h < by1
}

export function step(runner: Runner, input: Input, level: Level, aspect: number, dt = 1 / 60): Runner {
  if (runner.won) return runner
  const half = SIZE.w / 2 / aspect
  const vx = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * RUN_SPEED / aspect
  let { vy, jumps, grounded, layer } = runner
  let fromY = runner.y
  const layers = layersOf(level)
  const shift = (input.front ? 1 : 0) - (input.back ? 1 : 0)
  const target = layers[layers.indexOf(layer) + shift]
  if (shift && target !== undefined) [layer, grounded] = [target, false]
  // dropping starts the fall just under the current Surface so landing() skips it; the floor can't be dropped through
  if (input.drop && grounded && runner.y < 1) [fromY, grounded] = [runner.y + 1e-3, false]
  if (input.jump && jumps < MAX_JUMPS) [vy, jumps, grounded] = [-JUMP_SPEED, jumps + 1, false]
  vy += GRAVITY * dt

  const x = Math.min(1 - half, Math.max(half, runner.x + vx * dt))
  let y = fromY + vy * dt
  const ground = vy >= 0 ? landing(level, layer, runner.x, fromY, x, y, grounded) : null
  if (ground !== null) [y, vy, jumps, grounded] = [ground, 0, 0, true]
  else grounded = false

  const next = { x, y, vx, vy, grounded, jumps, won: false, layer }
  next.won = level.props.some(p => p.role === "exit" && overlaps(next, p.box, aspect))
  return next
}
