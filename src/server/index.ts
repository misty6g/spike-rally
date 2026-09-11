import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { isValidWinScore } from "../game/scoring";
import type { PlayerInput, Side } from "../game/types";
import { hasBothPlayers, RoomManager } from "./rooms";

const PORT = Number(process.env.PORT || 8787);
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
const rooms = new RoomManager();

app.use(express.static(path.join(__dirname, "../../public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, rooms: rooms.rooms.size });
});

app.post("/api/rooms", express.json(), (req, res) => {
  const mode = req.body?.mode === "local" ? "local" : "online";
  const winScore = Number(req.body?.winScore);
  const room = rooms.create(mode, isValidWinScore(winScore) ? winScore : 15);
  res.json({ code: room.code, mode: room.mode, winScore: room.state.winScore });
});

type ClientMsg =
  | { type: "join"; code: string }
  | { type: "create"; mode?: "local" | "online"; winScore?: number }
  | { type: "input"; side?: Side; input: Partial<PlayerInput> }
  | { type: "rematch" }
  | { type: "ping" };

function occupancy(code: string) {
  const room = rooms.get(code);
  if (!room) return [];
  return [...room.clients.values()].map((c) => ({ id: c.id, role: c.role }));
}

wss.on("connection", (ws: WebSocket) => {
  const id = Math.random().toString(36).slice(2, 10);
  let joinedCode: string | null = null;
  let assignedSide: Side | "spectator" = "spectator";

  const send = (data: string) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  };

  ws.on("message", (raw) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(String(raw)) as ClientMsg;
    } catch {
      return;
    }

    if (msg.type === "ping") {
      send(JSON.stringify({ type: "pong" }));
      return;
    }

    if (msg.type === "create") {
      const winScore = Number(msg.winScore);
      const room = rooms.create(
        msg.mode === "local" ? "local" : "online",
        isValidWinScore(winScore) ? winScore : 15
      );
      const joined = rooms.join(room.code, { id, send });
      if (!joined) return;
      joinedCode = room.code;
      assignedSide = joined.role;
      send(
        JSON.stringify({
          type: "joined",
          code: room.code,
          role: assignedSide,
          mode: room.mode,
          state: room.state,
          waiting: room.mode === "online" && !hasBothPlayers(room),
        })
      );
      return;
    }

    if (msg.type === "join") {
      const joined = rooms.join(msg.code, { id, send });
      if (!joined) {
        send(JSON.stringify({ type: "error", message: "Room not found. Check the code and try again." }));
        return;
      }
      joinedCode = joined.room.code;
      assignedSide = joined.role;
      send(
        JSON.stringify({
          type: "joined",
          code: joined.room.code,
          role: assignedSide,
          mode: joined.room.mode,
          state: joined.room.state,
          waiting: joined.room.mode === "online" && !hasBothPlayers(joined.room),
        })
      );
      rooms.broadcast(joined.room, {
        type: "peer",
        players: occupancy(joined.room.code),
        waiting: joined.room.mode === "online" && !hasBothPlayers(joined.room),
      });
      return;
    }

    if (msg.type === "rematch" && joinedCode) {
      const room = rooms.get(joinedCode);
      if (!room || room.state.phase !== "match_over") return;
      if (room.mode === "online" && assignedSide === "spectator") return;
      rooms.rematch(room);
      rooms.broadcast(room, {
        type: "state",
        state: room.state,
        waiting: room.mode === "online" && !hasBothPlayers(room),
      });
      return;
    }

    if (msg.type === "input" && joinedCode) {
      const room = rooms.get(joinedCode);
      if (!room) return;
      if (room.mode === "local") {
        const side = msg.side ?? (assignedSide === "spectator" ? "left" : assignedSide);
        if (side === "left" || side === "right") rooms.setInput(room, side, msg.input);
      } else if (assignedSide === "left" || assignedSide === "right") {
        rooms.setInput(room, assignedSide, msg.input);
      }
    }
  });

  ws.on("close", () => {
    if (!joinedCode) return;
    const code = joinedCode;
    rooms.leave(code, id);
    const room = rooms.get(code);
    if (room) {
      rooms.broadcast(room, {
        type: "peer",
        players: occupancy(code),
        waiting: room.mode === "online" && !hasBothPlayers(room),
      });
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.rooms.values()) {
    if (room.clients.size === 0) continue;
    const state = rooms.tick(room, now);
    rooms.broadcast(room, {
      type: "state",
      state,
      waiting: room.mode === "online" && !hasBothPlayers(room),
    });
  }
}, 1000 / 60);

server.listen(PORT, () => {
  console.log(`Spike Rally listening on http://localhost:${PORT}`);
});
