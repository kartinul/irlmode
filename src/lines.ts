export async function* lines(body: ReadableStream) {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader()
  let rest = ""
  for (let read = await reader.read(); !read.done; read = await reader.read()) {
    const parts = (rest + read.value).split("\n")
    rest = parts.pop()!
    yield* parts
  }
  if (rest) yield rest
}
