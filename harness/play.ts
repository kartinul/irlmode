import { chromium } from "playwright"
import { playToExit } from "./route.ts"

const port = 3077
const fixture = process.argv[2] ?? "desk"
const shots = new URL("./shots/", import.meta.url).pathname
const server = Bun.spawn(["bun", "server.ts"], { env: { ...process.env, PORT: String(port) }, stdout: "ignore" })
const browser = await chromium.launch()

try {
  await Bun.sleep(300)
  const page = await browser.newPage({ viewport: { width: 1280, height: 600 } })
  page.on("pageerror", e => console.error(e))
  await page.goto(`http://localhost:${port}/?fixture=${fixture}`)
  await page.waitForFunction(() => window.game)
  const shot = (name: string) => page.screenshot({ path: `${shots}${fixture}-${name}.png` })

  await page.waitForTimeout(200)
  await shot("spawn")
  console.log("won", await playToExit(page, shot))
} finally {
  await browser.close()
  server.kill()
}
