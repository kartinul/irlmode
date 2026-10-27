import { chromium } from "playwright"
import { playToExit } from "./route.ts"

// bun run snap [--live]: without --live the server fakes Gemma with the desk fixture
const port = 3078
const live = process.argv.includes("--live")
const shots = new URL("./shots/", import.meta.url).pathname
const env = { ...process.env, PORT: String(port), FAKE_GEMMA: live ? "" : "fixtures/desk.level.json" }
const server = Bun.spawn(["bun", "server.ts"], { env, stdout: "inherit" })
const browser = await chromium.launch()

try {
  await Bun.sleep(300)
  const page = await browser.newPage({ viewport: { width: 1280, height: 600 } })
  page.on("pageerror", e => console.error(e))
  const shot = (name: string) => page.screenshot({ path: `${shots}snap-${name}.png` })

  await page.route("**/level", route => route.fulfill({ status: 502, json: { error: "harness: Gemma down" } }))
  await page.goto(`http://localhost:${port}/`)
  await page.locator("#retry").waitFor()
  await shot("error")
  await page.unroute("**/level")

  const started = Date.now()
  await page.click("#retry")
  await page.locator("#loading").waitFor()
  await shot("loading")

  await page.locator("#level-name").waitFor({ timeout: 60_000 })
  console.log(`Snap → playable in ${((Date.now() - started) / 1000).toFixed(1)} s: "${await page.textContent("#level-name")}"`)
  await shot("title")
  console.log("won", await playToExit(page, shot))
} finally {
  await browser.close()
  server.kill()
}
