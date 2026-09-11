# Spike Rally

Real-time **2D volleyball** mini-game with polished Canvas UI, deterministic physics, scoring, serve flow, and win conditions.

Built as a lean TypeScript stack for demonstrating **real-time multiplayer** patterns (local couch play + room-code online).

## Features

- Local 2-player (same keyboard) and online room-code multiplayer via WebSockets
- Physics: gravity, jumps, hits, wall/net collisions, floor bounce
- Rally scoring to 7 with serve possession for the point winner
- 60 Hz authoritative server simulation + client prediction-free render loop
- Unit-tested game engine and room manager

## Stack

- **TypeScript** game engine (`src/game`)
- **Node.js** + **Express** static host + **`ws`** WebSocket server (`src/server`)
- **HTML5 Canvas** client (`public/`)

## Quick start

```bash
npm install
npm test
npm run build
npm start
# open http://localhost:8787
```

Dev (tsx watch):

```bash
npm run dev
```

### Controls

| Player | Move | Jump | Hit / Serve |
|--------|------|------|-------------|
| P1 (left) | A / D | W | Space |
| P2 (right) | ← / → | ↑ | Enter |

Online players can use either binding set. First to **7** wins.

## Architecture

```
Browser Canvas  --input-->  WebSocket  -->  RoomManager.tick()
        ^                                      |
        +------------- state broadcast ---------+
```

- `RoomManager` owns authoritative `GameState`, merges inputs, steps physics at ~60 Hz, broadcasts snapshots.
- `create` / `join` assigns `left` → `right` → `spectator`.
- Local mode lets one client submit inputs for both sides.

## Tests

```bash
npm test
```

Vitest covers physics helpers, serve/play/point/match flow, movement, room codes, and join roles (≥8 cases).

## License

MIT © Gyan Mistry
