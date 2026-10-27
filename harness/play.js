import { chromium } from "playwright"

const port = 3077
const fixture = process.argv[2] ?? "desk"
const shots = new URL("./shots/", import.meta.url).pathname
const server = Bun.spawn(["bun", "server.js"], { env: { ...process.env, PORT: String(port) }, stdout: "ignore" })
const browser = await chromium.launch()

try {
  await Bun.sleep(300)
  const page = await browser.newPage({ viewport: { width: 1280, height: 600 } })
  page.on("pageerror", e => console.error(e))
  await page.goto(`http://localhost:${port}/?fixture=${fixture}`)
  await page.waitForFunction(() => window.game)

  const state = () => page.evaluate(() => window.game.state)
  const until = (check, arg) =>
    page.waitForFunction(check, arg, { timeout: 6000, polling: 16 }).catch(async e => {
      const { level, ...rest } = await state()
      throw new Error(`stuck at ${JSON.stringify(rest)}`, { cause: e })
    })
  const jump = () => page.keyboard.press("Space")
  const shot = name => page.screenshot({ path: `${shots}${fixture}-${name}.png` })

  await page.waitForTimeout(200)
  await shot("spawn")

  await page.keyboard.down("ArrowRight")
  await jump()
  await page.waitForTimeout(150)
  await page.keyboard.up("ArrowRight")
  await page.waitForTimeout(200)
  await jump()
  await until(() => window.game.state.grounded && window.game.state.runner.y < 0.9)
  await shot("mid-climb")

  const exit = (await state()).level.props.find(p => p.role === "exit").box
  const exitX = (exit[0] + exit[2]) / 2
  const key = (await state()).runner.x < exitX ? "ArrowRight" : "ArrowLeft"
  await page.keyboard.down(key)
  await until(x => Math.abs(window.game.state.runner.x - x) < 0.01, exitX)
  await page.keyboard.up(key)
  await jump()
  await page.waitForTimeout(350)
  if (!(await state()).won) await jump()
  await until(() => window.game.state.won)
  await shot("win")
  console.log("won", await state().then(s => s.runner))
} finally {
  await browser.close()
  server.kill()
}
