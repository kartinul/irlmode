import { normalize } from "node:path"

const port = Number(process.env.PORT ?? 3000)

Bun.serve({
  port,
  async fetch(req) {
    const path = normalize(decodeURIComponent(new URL(req.url).pathname))
    const root = path.startsWith("/fixtures/") ? "." : "./public"
    const file = Bun.file(root + (path.endsWith("/") ? path + "index.html" : path))
    return (await file.exists()) ? new Response(file) : new Response("not found", { status: 404 })
  },
})

console.log(`IRL Mode on http://localhost:${port}`)
