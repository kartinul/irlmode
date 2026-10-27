import { afterAll, expect, test } from "bun:test"
import type { Level } from "../src/types.ts"

const servers: Bun.Subprocess[] = []
afterAll(() => servers.forEach(server => server.kill()))

async function serve(fakeGemma: string, port: number) {
  servers.push(Bun.spawn(["bun", "server.ts"], { env: { ...process.env, PORT: String(port), FAKE_GEMMA: fakeGemma }, stdout: "ignore" }))
  await Bun.sleep(300)
  return () => fetch(`http://localhost:${port}/level`)
}

test("level endpoint turns the demo Snap into a Level", async () => {
  const getLevel = await serve("fixtures/desk.level.json", 3091)
  const res = await getLevel()
  const level = (await res.json()) as Level
  expect(res.status).toBe(200)
  expect(level.name).toBe("The IT Lab Gauntlet")
  expect(level.props.filter(p => p.role === "exit")).toHaveLength(1)
})

test("level endpoint reports a Gemma failure as a 502 with a message", async () => {
  const getLevel = await serve("fail", 3092)
  const res = await getLevel()
  expect(res.status).toBe(502)
  expect(((await res.json()) as { error: string }).error).toBeString()
})
