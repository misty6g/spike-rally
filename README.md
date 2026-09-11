# Spike Rally

Real-time **2D volleyball** for the browser: Canvas court, arcade physics, rally scoring to **15 or 25**, local couch play, and optional WebSocket rooms joined by a short code.

Built by [Gyan Mistry](https://github.com/misty6g) as a compact TypeScript project for real-time game-server work (authoritative simulation, input merging, room lifecycle).

## Features

- Local 2-player on one keyboard and online 1v1 via room code (third joiner spectates)
- Serve → rally → point pause → next serve; match ends at 15 or 25
- Gravity, jumps, bumps/spikes, wall and net collisions
- Scoreboard, rally counter, game-point callout, rematch
- No accounts, no paid APIs, no secrets

## Stack

| Layer | Code | Role |
| --- | --- | --- |
| Shared sim | `src/game/` | Physics, scoring, match flow |
| Server | `src/server/` | Express static host + `ws` rooms, 60 Hz tick |
| Client | `src/client/` + `public/` | Canvas renderer, keyboard, HUD |

```
Browser (Canvas + input)
        │  WebSocket JSON
        ▼
RoomManager.tick()  ──60 Hz──►  step(state, inputs, dt)
        │
        └── broadcast { type: "state", state }
```

- **Authoritative server.** The browser never simulates scoring; it renders snapshots and sends inputs.
- **Local mode** lets one client submit left and right inputs. **Online** binds each socket to `left` → `right` → `spectator`.
- Online matches wait until both sides are seated.

## How to run

Requires Node.js 18+.

```bash
npm install
npm test
npm run build
npm start
```

Open [http://localhost:8787](http://localhost:8787).

Dev (rebuilds the client once, then watches the server):

```bash
npm run dev
```

After client edits, run `npm run build:client` (or restart `npm run dev`).

| Script | What it does |
| --- | --- |
| `npm test` | Vitest: physics, scoring, engine, rooms |
| `npm run build` | Compile server → `dist/` and client → `public/js/` |
| `npm start` | Listen on `PORT` or `8787` |
| `npm run typecheck` | `tsc --noEmit` for server and client |

Shortcuts:

- `http://localhost:8787/?local=1` — skip the menu, start local
- `http://localhost:8787/?room=ABCDE` — join a code
- `http://localhost:8787/?to=25` — preselect play-to-25

## How to play

Rally scoring: the ball hitting the sand on your court gives the **other** player the point. Winner of the rally serves next. First to **15** or **25** (chosen on the menu) wins. Rematch from the overlay.

| | Move | Jump | Hit / serve |
| --- | --- | --- | --- |
| Left (P1) | A / D | W | Space |
| Right (P2) | ← / → | ↑ | Enter |

Online, either binding set controls **your** assigned side. Share the room code from the footer.

## Architecture notes

- `src/game/physics.ts` — integrate players/ball, net AABB, hit impulse
- `src/game/scoring.ts` — land-side winner, first-to-N match, game point
- `src/game/engine.ts` — serve follow, play step, award point, rematch reset
- `src/server/rooms.ts` — codes, join roles, 60 Hz tick, point pause (~1.1s)
- `src/server/index.ts` — `/ws`, `/api/health`, `/api/rooms`, static `public/`
- `src/client/render.ts` — dusk beach court, players, spinning ball

Protocol (JSON over `/ws`): `create`, `join`, `input`, `rematch` from the client; `joined`, `state`, `peer`, `error` from the server.

## Tests

```bash
npm test
```

Coverage is the pure sim and room manager: clamp/distance/bounds, gravity and net collision, land-side scoring, serve rules, match end at 15/25, join order, and online wait-for-opponent.

## License

MIT © Gyan Mistry
