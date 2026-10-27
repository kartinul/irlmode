# IRL Mode

Snap a photo of the real world and play it as a 2D platformer. Gemma reads the photo, picks out the real objects (desks, monitors, bottles) and turns them into the level: their edges become Surfaces, and their Roles make them platforms, hazards, coins, bouncers, wind or the exit.

## Run

Needs [Bun](https://bun.sh) and a Gemini API key.

```sh
bun install
echo "GEMINI_API_KEY=your-key" > .env
bun dev
```

Open http://localhost:3000.

To play without calling Gemma, use a saved Level:

```sh
FAKE_GEMMA=fixtures/desk.level.json bun dev
```

## Controls

| Key | Action |
|-----|--------|
| ← → / A D | Move |
| Space / ↑ / W | Jump (double jump in the air) |
| ↓ / S | Drop through a Surface |
| Q / E | Step back / forward a Layer |

## Scripts

| Command | What it does |
|---------|--------------|
| `bun dev` | Server with hot reload |
| `bun start` | Server |
| `bun test` | Tests |
| `bun run typecheck` | Strict `tsc` |
| `bun run play` | Plays the desk fixture headless to the exit |
| `bun run snap` | Snap → Level → play flow in a browser |

## Layout

- `server.ts`: serves the game and the Gemma level endpoint
- `src/`: Level types and the Gemma level reader
- `public/`: the game (canvas, Runner, input)
- `harness/`: play and snap harnesses, overlay for checking Gemma's Boxes
- `fixtures/`: sample Snaps and Levels
- `GLOSSARY.md`: domain words; `docs/adr/`: decisions
