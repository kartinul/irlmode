import type { Box, Level, Point } from "../src/types.ts"

export type Runner = { x: number; y: number; vx: number; vy: number; grounded: boolean; jumps: number; won: boolean }
export type Input = { left?: boolean; right?: boolean; jump?: boolean }

export const SIZE = { w: 0.035, h: 0.07 }
const GRAVITY = 3
const JUMP_SPEED = 1.5
const RUN_SPEED = 0.7
const MAX_JUMPS = 2
const STICK = 0.02

export const spawn = (aspect: number): Runner => ({ x: SIZE.w / 2 / aspect, y: 1, vx: 0, vy: 0, grounded: true, jumps: 0, won: false })

type Surface = [Point, Point]
const floor: Surface = [[0, 1], [1, 1]]
const surfaces = (level: Level) => [floor, ...level.props.flatMap(p => (p.surface ? [p.surface] : []))]

const heightAt = ([[x0, y0], [x1, y1]]: Surface, x: number) => (x < x0 || x > x1 ? null : y0 + ((x - x0) / (x1 - x0 || 1)) * (y1 - y0))

function landing(level: Level, x0: number, y0: number, x1: number, y1: number, grounded: boolean) {
  let best: number | null = null
  for (const surface of surfaces(level)) {
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
  let { vy, jumps, grounded } = runner
  if (input.jump && jumps < MAX_JUMPS) [vy, jumps, grounded] = [-JUMP_SPEED, jumps + 1, false]
  vy += GRAVITY * dt

  const x = Math.min(1 - half, Math.max(half, runner.x + vx * dt))
  let y = runner.y + vy * dt
  const ground = vy >= 0 ? landing(level, runner.x, runner.y, x, y, grounded) : null
  if (ground !== null) [y, vy, jumps, grounded] = [ground, 0, 0, true]
  else grounded = false

  const next = { x, y, vx, vy, grounded, jumps, won: false }
  next.won = level.props.some(p => p.role === "exit" && overlaps(next, p.box, aspect))
  return next
}
