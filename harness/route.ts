import type { Page } from "playwright"
import type {} from "../public/main.ts"

// Scripted keyboard route on a running game: double jump onto the desk, walk under the exit, jump in.
export async function playToExit(page: Page, shot: (name: string) => Promise<unknown>) {
  const state = () => page.evaluate(() => window.game!.state)
  const until = (check: (arg: number) => boolean, arg = 0) =>
    page.waitForFunction(check, arg, { timeout: 6000, polling: 16 }).catch(async e => {
      const { level, ...rest } = await state()
      throw new Error(`stuck at ${JSON.stringify(rest)}`, { cause: e })
    })
  const jump = () => page.keyboard.press("Space")

  await page.keyboard.down("ArrowRight")
  await jump()
  await page.waitForTimeout(350)
  await jump()
  await until(() => window.game!.state.grounded && window.game!.state.runner.y < 0.9)
  await page.keyboard.up("ArrowRight")
  await shot("mid-climb")

  const exit = (await state()).level.props.find(p => p.role === "exit")!.box
  const exitX = (exit[0] + exit[2]) / 2
  const key = (await state()).runner.x < exitX ? "ArrowRight" : "ArrowLeft"
  await page.keyboard.down(key)
  await until((x: number) => window.game!.state.won || Math.abs(window.game!.state.runner.x - x) < 0.01, exitX)
  await page.keyboard.up(key)
  await jump()
  await page.waitForTimeout(350)
  if (!(await state()).won) await jump()
  await until(() => window.game!.state.won)
  await shot("win")
  return (await state()).runner
}
