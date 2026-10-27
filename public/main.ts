import { startGame, type GameState } from "./game.ts"
import { lines } from "../src/lines.ts"
import { drawReview } from "./review.ts"
import type { Step } from "../src/level.ts"
import type { Level } from "../src/types.ts"

declare global {
  interface Window { game?: { readonly state: GameState } }
}

const $ = (id: string) => document.getElementById(id)!
const canvas = $("game") as HTMLCanvasElement
const show = (card: string) => ["pick", "loading", "error", "title"].forEach(id => ($(id).hidden = id !== card))

let image = ""
let fetchLevel = () => fetch("")
const debug = () => ($("debug") as HTMLInputElement).checked

function stepView({ title, prompt, reply, ms }: Step) {
  const view = document.createElement("details")
  view.innerHTML = `<summary></summary><b>prompt</b><pre></pre><b>reply</b><pre></pre>`
  view.querySelector("summary")!.textContent = `${title} · ${(ms / 1000).toFixed(1)} s`
  const [promptView, replyView] = view.querySelectorAll("pre")
  promptView.textContent = prompt
  replyView.textContent = reply
  return view
}

async function readSteps(res: Response): Promise<Level> {
  if (!res.ok) throw new Error(await res.text())
  let level: Level | undefined
  for await (const line of lines(res.body!)) {
    const message = JSON.parse(line)
    if (message.error) throw new Error(message.error)
    if (message.step) $("steps").append(stepView(message.step))
    level = message.level ?? level
  }
  if (!level) throw new Error("stream ended without a Level")
  return level
}

// Gemma looks at the draft drawn over the Snap and fixes small mistakes; a failed review keeps the draft
async function review(draft: Level) {
  const overlay = await drawReview(image, draft)
  const preview = Object.assign(new Image(), { src: overlay, alt: "review image sent to Gemma" })
  preview.style.width = "100%"
  $("steps").append(preview)
  const res = await fetch("/review", { method: "POST", body: JSON.stringify({ level: draft, image: overlay.split(",")[1] }) })
  return readSteps(res).catch(e => (console.error(e), draft))
}

async function play() {
  show("loading")
  try {
    $("steps").replaceChildren()
    $("log").toggleAttribute("open", true)
    const level = await review(await readSteps(await fetchLevel()))
    $("level-name").textContent = level.name
    window.game = await startGame(canvas, image, level, debug())
    show("title")
    $("log").toggleAttribute("open", false)
    setTimeout(() => ($("title").style.opacity = "0"), 2000)
  } catch (e) {
    console.error(e)
    show("error")
  }
}

$("retry").addEventListener("click", play)

const fixture = new URLSearchParams(location.search).get("fixture")
if (fixture) {
  show("")
  const level = await (await fetch(`/fixtures/${fixture}.level.json`)).json()
  window.game = await startGame(canvas, `/fixtures/${fixture}.jpg`, level)
} else {
  const names: string[] = await (await fetch("/snaps")).json()
  $("snaps").replaceChildren(...names.map(name => {
    const button = document.createElement("button")
    button.dataset.snap = name
    button.innerHTML = `<img src="/fixtures/${name}.jpg" alt=""><span>${name}</span>`
    button.addEventListener("click", () => {
      image = `/fixtures/${name}.jpg`
      fetchLevel = () => fetch(`/level?snap=${name}`)
      play()
    })
    return button
  }))
}

// Gemma reads JPEG, so any picture the browser can open is re-encoded first
$("upload").addEventListener("change", async e => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const bitmap = await createImageBitmap(file)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0)
  const jpeg = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 })
  image = URL.createObjectURL(jpeg)
  fetchLevel = () => fetch("/level", { method: "POST", body: jpeg })
  play()
})
