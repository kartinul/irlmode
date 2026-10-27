import { startGame, type GameState } from "./game.ts"

declare global {
  interface Window { game?: { readonly state: GameState } }
}

const fixture = new URLSearchParams(location.search).get("fixture")
if (fixture) {
  const level = await (await fetch(`/fixtures/${fixture}.level.json`)).json()
  window.game = await startGame(document.getElementById("game") as HTMLCanvasElement, `/fixtures/${fixture}.jpg`, level)
}
