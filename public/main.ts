import { startGame, type GameState } from "./game.ts"
import type { Level } from "../src/types.ts"

declare global {
  interface Window { game?: { readonly state: GameState } }
}

const DEMO_SNAP = "/fixtures/desk.jpg"
const $ = (id: string) => document.getElementById(id)!
const canvas = $("game") as HTMLCanvasElement
const show = (card: string) => ["loading", "error", "title"].forEach(id => ($(id).hidden = id !== card))

async function play() {
  show("loading")
  try {
    const res = await fetch("/level")
    if (!res.ok) throw new Error(await res.text())
    const level: Level = await res.json()
    $("level-name").textContent = level.name
    window.game = await startGame(canvas, DEMO_SNAP, level)
    show("title")
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
} else play()
