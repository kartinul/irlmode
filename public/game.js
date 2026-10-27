import { SIZE, spawn, step } from "./runner.js"

const DT = 1 / 60
const KEYS = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" }
const JUMP_KEYS = ["Space", "ArrowUp", "KeyW"]

export async function startGame(canvas, snapUrl, level) {
  const snap = new Image()
  snap.src = snapUrl
  await snap.decode()
  const aspect = snap.naturalWidth / snap.naturalHeight
  const ctx = canvas.getContext("2d")
  const input = { left: false, right: false, jump: false }
  let runner = spawn(aspect)

  addEventListener("keydown", e => {
    if (KEYS[e.code]) input[KEYS[e.code]] = true
    if (JUMP_KEYS.includes(e.code) && !e.repeat) input.jump = true
  })
  addEventListener("keyup", e => KEYS[e.code] && (input[KEYS[e.code]] = false))

  const view = () => {
    canvas.width = innerWidth * devicePixelRatio
    canvas.height = innerHeight * devicePixelRatio
    const h = Math.min(canvas.height, canvas.width / aspect)
    return { w: h * aspect, h, x: (canvas.width - h * aspect) / 2, y: (canvas.height - h) / 2 }
  }
  let fit = view()
  addEventListener("resize", () => (fit = view()))

  const draw = () => {
    const px = (x, y) => [fit.x + x * fit.w, fit.y + y * fit.h]
    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(snap, fit.x, fit.y, fit.w, fit.h)
    ctx.lineWidth = 3
    ctx.strokeStyle = "#ffe14d"
    for (const { surface } of level.props.filter(p => p.surface)) {
      ctx.beginPath()
      ctx.moveTo(...px(...surface[0]))
      ctx.lineTo(...px(...surface[1]))
      ctx.stroke()
    }
    ctx.strokeStyle = "#3dff7a"
    for (const { box } of level.props.filter(p => p.role === "exit")) ctx.strokeRect(...px(box[0], box[1]), (box[2] - box[0]) * fit.w, (box[3] - box[1]) * fit.h)
    const [w, h] = [(SIZE.w / aspect) * fit.w, SIZE.h * fit.h]
    const [rx, ry] = px(runner.x, runner.y)
    ctx.fillStyle = "#ff3d6e"
    ctx.fillRect(rx - w / 2, ry - h, w, h)
    if (runner.won) {
      ctx.fillStyle = "#fff"
      ctx.font = `bold ${fit.h / 8}px system-ui`
      ctx.textAlign = "center"
      ctx.fillText("You win!", canvas.width / 2, canvas.height / 2)
    }
  }

  let last = performance.now()
  let pending = 0
  const frame = now => {
    pending = Math.min(pending + (now - last) / 1000, 0.25)
    last = now
    for (; pending >= DT; pending -= DT) {
      runner = step(runner, input, level, aspect, DT)
      input.jump = false
    }
    draw()
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)

  return {
    get state() {
      return structuredClone({ runner: { x: runner.x, y: runner.y }, grounded: runner.grounded, won: runner.won, level })
    },
  }
}
