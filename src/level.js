const ROLES = ["platform", "hazard", "coin", "bouncy", "wind", "exit"];
const WINDS = ["left", "right", "up", "down"];

const clamp = (n) => Math.min(1, Math.max(0, n));

function toBox(box) {
  if (!Array.isArray(box) || box.length !== 4 || !box.every(Number.isFinite)) return null;
  const [ax, ay, bx, by] = box.map(clamp);
  const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx);
  const y0 = Math.min(ay, by), y1 = Math.max(ay, by);
  return x1 > x0 && y1 > y0 ? [x0, y0, x1, y1] : null;
}

function toSurface(surface, [x0, y0, x1, y1]) {
  const points = Array.isArray(surface) && surface.length === 2 && surface.flat().length === 4 && surface.flat().every(Number.isFinite);
  const nearTop = points && surface.every(([, y]) => y <= y0 + (y1 - y0) / 4);
  if (!nearTop) return [[x0, y0], [x1, y0]];
  const [a, b] = surface.map((point) => point.map(clamp));
  return a[0] <= b[0] ? [a, b] : [b, a];
}

function toProp({ label, role, box, layer, surface, wind }) {
  const cleanBox = toBox(box);
  if (!ROLES.includes(role) || !cleanBox) return null;
  const prop = { label: String(label ?? role), role, box: cleanBox, layer: Math.round(Number(layer)) || 0 };
  if (role === "platform") prop.surface = toSurface(surface, cleanBox);
  if (role === "wind") prop.wind = WINDS.includes(wind) ? wind : "down";
  return prop;
}

const yxToXy = (v) => (Array.isArray(v) && v.every((n) => typeof n === "number") ? v.map((n) => n / 1000) : v);
const boxFrom = (box) => { const b = yxToXy(box); return Array.isArray(b) && b.length === 4 ? [b[1], b[0], b[3], b[2]] : b; };
const surfaceFrom = (surface) => (Array.isArray(surface) ? surface.map((point) => { const p = yxToXy(point); return Array.isArray(p) ? p.toReversed() : p; }) : surface);

const withRole = (prop, role) => toProp({ ...prop, role });

function oneExit(props) {
  const exitAt = props.findIndex((prop) => prop.role === "exit");
  if (exitAt === -1) {
    const platforms = props.filter((prop) => prop.role === "platform");
    const highest = (platforms.length ? platforms : props).toSorted((a, b) => a.box[1] - b.box[1])[0];
    return props.map((prop) => (prop === highest ? withRole(prop, "exit") : prop));
  }
  return props.map((prop, i) => (prop.role === "exit" && i !== exitAt ? withRole(prop, "platform") : prop));
}

const MODEL_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent";

const PROMPT = `This photo becomes a 2D platformer level; its real objects are the terrain.
Find the main objects and reply with JSON only:
{"name": "<funny level title>", "props": [{"label": "<plain words>", "role": "platform|hazard|coin|bouncy|wind|exit", "box_2d": [y0, x0, y1, x1], "layer": <int, higher = nearer camera>, "surface": [[y, x], [y, x]], "wind": "left|right|up|down"}]}
Coords are integers 0..1000, origin top-left, y before x. box_2d is the tight box around the whole object.
surface (platforms only) is the edge a tiny figure would stand on: the front edge of the object's top face as seen in the photo, left point then right point; it may slant.
wind only for wind props. Exactly one exit. Use big flat things as platforms.
Include small objects too (mouse, cups, bags): make them coins or hazards.`;

export async function readLevel(jpegBytes) {
  const body = {
    contents: [{ parts: [
      { inline_data: { mime_type: "image/jpeg", data: Buffer.from(jpegBytes).toString("base64") } },
      { text: PROMPT },
    ] }],
    generationConfig: { thinkingConfig: { thinkingLevel: "minimal" } },
  };
  const res = await fetch(MODEL_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemma ${res.status}: ${await res.text()}`);
  const reply = (await res.json()).candidates[0].content.parts.filter((part) => !part.thought).map((part) => part.text).join("");
  return parseLevel(reply);
}

export function parseLevel(reply) {
  const level = JSON.parse(reply.slice(reply.indexOf("{"), reply.lastIndexOf("}") + 1));
  const props = (Array.isArray(level.props) ? level.props : [])
    .map((prop) => toProp({ ...prop, box: boxFrom(prop.box_2d), surface: surfaceFrom(prop.surface) }))
    .filter(Boolean);
  return { name: String(level.name ?? "Untitled Level"), props: oneExit(props) };
}
