import type { Level, Point, Prop, Role } from "../src/types.ts"
import { SIZE, centerLayer, layersOf, spawn, step, type Input } from "./runner.ts"
import sheetUrl from "./adventurer.png"

const DT = 1 / 60
const KEYS: Record<string, "left" | "right"> = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" }
const TAPS: Record<string, "jump" | "drop" | "back" | "front"> = { Space: "jump", ArrowUp: "jump", KeyW: "jump", KeyS: "drop", ArrowDown: "drop", KeyQ: "back", KeyE: "front" }
export const ROLE_COLORS: Record<Role, string> = { platform: "#ffe14d", exit: "#3dff7a", hazard: "#ff4040", coin: "#ffb000", bouncy: "#c77dff", wind: "#5ecbff", decor: "#d0d0d0" }
const WIND_ARROWS = { left: "←", right: "→", up: "↑", down: "↓" }
const FRAME = { w: 80, h: 110, cols: 9 }
const TAP_POSES: Partial<Record<keyof Input, number[]>> = { drop: [3], back: [5, 6, 22], front: [23, 23] }
const POSE_FPS = 7

export type GameState = { runner: { x: number; y: number }; grounded: boolean; won: boolean; layer: number; level: Level }

const outlineOf = ({ outline, box: [x0, y0, x1, y1] }: Prop): Point[] => outline ?? [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]

export async function startGame(canvas: HTMLCanvasElement, snapUrl: string, level: Level, debug = true) {
  const snap = new Image()
  snap.src = snapUrl
  await snap.decode()
  const sheet = new Image()
  sheet.src = sheetUrl
  await sheet.decode()
  const aspect = snap.naturalWidth / snap.naturalHeight
  const ctx = canvas.getContext("2d")!
  const input: Input = {}
  let runner = spawn(aspect, centerLayer(level))
  const layers = layersOf(level)
  const byDepth = level.props.toSorted((a, b) => a.layer - b.layer)
  const exits = level.props.filter(p => p.role === "exit")
  let facing = 1
  let pose = { frames: [] as number[], start: 0 }

  addEventListener("keydown", (e: KeyboardEvent) => {
    if (KEYS[e.code]) input[KEYS[e.code]] = true
    const tap = TAPS[e.code]
    if (!tap || e.repeat) return
    input[tap] = true
    if (TAP_POSES[tap]) pose = { frames: TAP_POSES[tap], start: performance.now() / 1000 }
  })
  addEventListener("keyup", (e: KeyboardEvent) => KEYS[e.code] && (input[KEYS[e.code]] = false))

  const view = () => {
    canvas.width = innerWidth * devicePixelRatio
    canvas.height = innerHeight * devicePixelRatio
    const h = Math.min(canvas.height, canvas.width / aspect)
    return { w: h * aspect, h, x: (canvas.width - h * aspect) / 2, y: (canvas.height - h) / 2 }
  }
  let fit = view()
  addEventListener("resize", () => (fit = view()))

  const draw = () => {
    const px = (x: number, y: number): Point => [fit.x + x * fit.w, fit.y + y * fit.h]
    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(snap, fit.x, fit.y, fit.w, fit.h)
    const trace = (points: Point[]) => {
      ctx.beginPath()
      points.forEach(point => ctx.lineTo(...px(...point)))
      ctx.closePath()
    }
    const tag = (text: string, [x, y]: Point) => {
      ctx.strokeText(text, x, y)
      ctx.fillText(text, x, y)
    }

    for (const exit of exits) {
      ctx.save()
      ctx.shadowColor = ctx.strokeStyle = ROLE_COLORS.exit
      ctx.shadowBlur = fit.h / 25
      ctx.fillStyle = "#3dff7a33"
      ctx.lineWidth = 3
      trace(outlineOf(exit))
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }

    const t = performance.now() / 1000
    const cycle = (frames: number[], fps: number) => frames[Math.floor(t * fps) % frames.length]!
    const posed = pose.frames[Math.floor((t - pose.start) * POSE_FPS)]
    const frame = runner.won ? cycle([7, 8], 4) : posed ?? (!runner.grounded ? (runner.vy < 0 ? 1 : 2) : runner.vx ? cycle([9, 10], 8) : 0)
    const h = SIZE.h * fit.h * 1.3
    const w = (h * FRAME.w) / FRAME.h
    const [rx, ry] = px(runner.x, runner.y)
    ctx.save()
    ctx.translate(rx, ry)
    ctx.scale(facing, 1)
    ctx.shadowColor = "#000"
    ctx.shadowBlur = h / 6
    ctx.drawImage(sheet, (frame % FRAME.cols) * FRAME.w, Math.floor(frame / FRAME.cols) * FRAME.h, FRAME.w, FRAME.h, -w / 2, -h, w, h)
    ctx.restore()
    for (const prop of byDepth.filter(p => p.layer > runner.layer)) {
      ctx.save()
      trace(outlineOf(prop))
      ctx.clip()
      ctx.drawImage(snap, fit.x, fit.y, fit.w, fit.h)
      ctx.restore()
    }

    ctx.lineWidth = 2
    for (const prop of byDepth) {
      ctx.strokeStyle = ROLE_COLORS[prop.role]
      ctx.setLineDash(prop.layer === runner.layer ? [] : [6, 6])
      if (debug) {
        trace(outlineOf(prop))
        ctx.stroke()
      }
      if (!prop.surface) continue
      ctx.lineWidth = prop.layer === runner.layer ? 5 : 2
      ctx.beginPath()
      ctx.moveTo(...px(...prop.surface[0]))
      ctx.lineTo(...px(...prop.surface[1]))
      ctx.stroke()
      ctx.lineWidth = 2
    }
    ctx.setLineDash([])

    const size = fit.h / 45
    ctx.font = `bold ${size}px system-ui`
    ctx.textAlign = "left"
    ctx.lineWidth = 3
    ctx.strokeStyle = "#000"
    for (const { box, role, label, layer, wind } of debug ? byDepth : []) {
      ctx.fillStyle = ROLE_COLORS[role]
      tag(`L${layer} ${role}: ${label}${wind ? ` ${WIND_ARROWS[wind]}` : ""}`, px(box[0], box[1]).map((n, i) => n + (i ? size : 4)) as Point)
    }
    ctx.fillStyle = "#fff"
    tag(`Layer ${runner.layer} of [${layers.join(", ")}]   Q back · E front · S drop`, [fit.x + 8, fit.y + fit.h - 8])
    if (runner.won) {
      ctx.fillStyle = "#fff"
      ctx.font = `bold ${fit.h / 8}px system-ui`
      ctx.textAlign = "center"
      ctx.fillText("You win!", canvas.width / 2, canvas.height / 2)
    }
  }

  let last = performance.now()
  let pending = 0
  const frame = (now: number) => {
    pending = Math.min(pending + (now - last) / 1000, 0.25)
    last = now
    for (; pending >= DT; pending -= DT) {
      runner = step(runner, input, level, aspect, DT)
      if (runner.vx) facing = Math.sign(runner.vx)
      input.jump = input.drop = input.back = input.front = false
    }
    draw()
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)

  return {
    get state(): GameState {
      return structuredClone({ runner: { x: runner.x, y: runner.y }, grounded: runner.grounded, won: runner.won, layer: runner.layer, level })
    },
  }
}
