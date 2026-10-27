import type { Level } from "../src/types.ts"
import { ROLE_COLORS } from "./game.ts"

// The Snap with every Prop's id, box, Surface and Layer drawn on it, as a JPEG data URL for Gemma to review
export async function drawReview(snapUrl: string, level: Level): Promise<string> {
  const snap = new Image()
  snap.src = snapUrl
  await snap.decode()
  const canvas = document.createElement("canvas")
  const [w, h] = [(canvas.width = snap.naturalWidth), (canvas.height = snap.naturalHeight)]
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(snap, 0, 0)
  const size = Math.round(h / 45)
  ctx.font = `bold ${size}px system-ui`
  ctx.lineJoin = "round"
  level.props.forEach(({ box: [x0, y0, x1, y1], surface, role, label, layer }, id) => {
    ctx.strokeStyle = ctx.fillStyle = ROLE_COLORS[role]
    ctx.lineWidth = 2
    ctx.strokeRect(x0 * w, y0 * h, (x1 - x0) * w, (y1 - y0) * h)
    if (surface) {
      ctx.lineWidth = 6
      ctx.beginPath()
      surface.forEach(([x, y]) => ctx.lineTo(x * w, y * h))
      ctx.stroke()
    }
    const text = `${id} ${label} L${layer}`
    ctx.lineWidth = 4
    ctx.strokeStyle = "#000"
    ctx.strokeText(text, x0 * w + 4, y0 * h + size)
    ctx.fillText(text, x0 * w + 4, y0 * h + size)
  })
  return canvas.toDataURL("image/jpeg", 0.9)
}
