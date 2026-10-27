import { expect, test } from "bun:test"
import { lines } from "./lines.ts"

test("splits a chunked stream into whole lines", async () => {
  const body = new Response(new ReadableStream({
    start(controller) {
      for (const chunk of ['{"a":', '1}\n{"b"', ":2}\n\n", "tail"]) controller.enqueue(new TextEncoder().encode(chunk))
      controller.close()
    },
  })).body!
  expect(await Array.fromAsync(lines(body))).toEqual(['{"a":1}', '{"b":2}', "", "tail"])
})
