import { normalize } from "node:path"
import index from "./public/index.html"
import { readLevel, reviewLevel, type Step } from "./src/level.ts"
import type { Level } from "./src/types.ts"

const port = Number(process.env.PORT ?? 3000)
const fake = process.env.FAKE_GEMMA
const snaps = () => Array.fromAsync(new Bun.Glob("*.jpg").scan("fixtures"), file => file.slice(0, -4))

// FAKE_GEMMA=<level.json> answers with that Level, FAKE_GEMMA=fail with an error; both after a short delay
async function fakeLevel(): Promise<Level> {
  await Bun.sleep(1500)
  if (fake === "fail") throw new Error("fake Gemma failure")
  return Bun.file(fake!).json()
}

// Streams NDJSON: one {step} line per Gemma call, then one {level} or {error} line
function streamed(run: (onStep: (step: Step) => void) => Promise<Level>) {
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    async start(controller) {
      const send = (message: object) => controller.enqueue(encoder.encode(JSON.stringify(message) + "\n"))
      try {
        send({ level: await run(step => send({ step })) })
      } catch (e) {
        console.error(e)
        send({ error: String(e) })
      }
      controller.close()
    },
  })
  return new Response(body, { headers: { "content-type": "application/x-ndjson" } })
}

async function level(req: Request) {
  const snap = new URL(req.url).searchParams.get("snap") ?? "desk"
  if (!(await snaps()).includes(snap)) return new Response("unknown snap", { status: 404 })
  return streamed(async onStep => (fake ? fakeLevel() : readLevel(await Bun.file(`fixtures/${snap}.jpg`).arrayBuffer(), onStep)))
}

async function upload(req: Request) {
  const jpeg = await req.arrayBuffer()
  return streamed(async onStep => (fake ? fakeLevel() : readLevel(jpeg, onStep)))
}

// Body: {level, image}: the draft Level and the browser's overlay drawing of it as base64 JPEG
async function review(req: Request) {
  const { level, image } = await req.json()
  return streamed(async onStep => (fake ? level : reviewLevel(new Uint8Array(Buffer.from(image, "base64")).buffer, level, onStep)))
}

Bun.serve({
  port,
  idleTimeout: 255,
  routes: { "/": index, "/level": { GET: level, POST: upload }, "/review": { POST: review }, "/snaps": { GET: async () => Response.json((await snaps()).sort()) } },
  async fetch(req) {
    const path = normalize(decodeURIComponent(new URL(req.url).pathname))
    const file = Bun.file("." + path)
    return path.startsWith("/fixtures/") && (await file.exists()) ? new Response(file) : new Response("not found", { status: 404 })
  },
})

console.log(`IRL Mode on http://localhost:${port}${fake ? ` (FAKE_GEMMA=${fake})` : ""}`)
