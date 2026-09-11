import type { GameState, PlayerInput, Side } from "../game/types.js";

export type ServerMsg =
  | {
      type: "joined";
      code: string;
      role: Side | "spectator";
      mode: "local" | "online";
      state: GameState;
      waiting: boolean;
    }
  | { type: "state"; state: GameState; waiting?: boolean }
  | { type: "peer"; players: { id: string; role: string }[]; waiting?: boolean }
  | { type: "error"; message: string }
  | { type: "pong" };

export type ClientMsg =
  | { type: "create"; mode: "local" | "online"; winScore: number }
  | { type: "join"; code: string }
  | { type: "input"; side?: Side; input: Partial<PlayerInput> }
  | { type: "rematch" }
  | { type: "ping" };

export interface Session {
  ws: WebSocket;
  send: (msg: ClientMsg) => void;
  close: () => void;
}

export function connect(onMessage: (msg: ServerMsg) => void, onStatus: (s: string) => void): Session {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/ws`);

  ws.addEventListener("open", () => onStatus("connected"));
  ws.addEventListener("close", () => onStatus("disconnected"));
  ws.addEventListener("error", () => onStatus("error"));
  ws.addEventListener("message", (ev) => {
    try {
      onMessage(JSON.parse(String(ev.data)) as ServerMsg);
    } catch {
      /* ignore malformed frames */
    }
  });

  return {
    ws,
    send(msg) {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    },
    close() {
      ws.close();
    },
  };
}
