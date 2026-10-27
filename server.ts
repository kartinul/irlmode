import { normalize } from "node:path"
import index from "./public/index.html"

const port = Number(process.env.PORT ?? 3000)

Bun.serve({
  port,
  routes: { "/": index },
  async fetch(req) {
    const path = normalize(decodeURIComponent(new URL(req.url).pathname))
    const file = Bun.file("." + path)
    return path.startsWith("/fixtures/") && (await file.exists()) ? new Response(file) : new Response("not found", { status: 404 })
  },
})

console.log(`IRL Mode on http://localhost:${port}`)
