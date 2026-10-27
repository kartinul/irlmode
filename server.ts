import { normalize } from "node:path"
import index from "./public/index.html"
import { readLevel } from "./src/level.ts"
import type { Level } from "./src/types.ts"

const port = Number(process.env.PORT ?? 3000)
const fake = process.env.FAKE_GEMMA
const DEMO_SNAP = "fixtures/desk.jpg"

// FAKE_GEMMA=<level.json> answers with that Level, FAKE_GEMMA=fail with an error; both after a short delay
async function fakeLevel(): Promise<Level> {
  await Bun.sleep(1500)
  if (fake === "fail") throw new Error("fake Gemma failure")
  return Bun.file(fake!).json()
}

async function level() {
  try {
    return Response.json(fake ? await fakeLevel() : await readLevel(await Bun.file(DEMO_SNAP).arrayBuffer()))
  } catch (e) {
    console.error(e)
    return Response.json({ error: String(e) }, { status: 502 })
  }
}

Bun.serve({
  port,
  idleTimeout: 60,
  routes: { "/": index, "/level": { GET: level } },
  async fetch(req) {
    const path = normalize(decodeURIComponent(new URL(req.url).pathname))
    const file = Bun.file("." + path)
    return path.startsWith("/fixtures/") && (await file.exists()) ? new Response(file) : new Response("not found", { status: 404 })
  },
})

console.log(`IRL Mode on http://localhost:${port}${fake ? ` (FAKE_GEMMA=${fake})` : ""}`)
