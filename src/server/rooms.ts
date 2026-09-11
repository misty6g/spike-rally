import { randomBytes } from "crypto";
import {
  continueAfterPoint,
  createInitialState,
  serializeState,
  step,
} from "../game/engine";
import { DEFAULT_INPUT, type GameState, type PlayerInput, type Side } from "../game/types";

export type ClientRole = Side | "spectator";

export interface RoomClient {
  id: string;
  role: ClientRole;
  send: (data: string) => void;
}

export interface Room {
  code: string;
  mode: "local" | "online";
  state: GameState;
  inputs: Record<Side, PlayerInput>;
  clients: Map<string, RoomClient>;
  pointTimer: number | null;
  lastTick: number;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(len = 5): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  return out;
}

export class RoomManager {
  rooms = new Map<string, Room>();

  create(mode: "local" | "online" = "online"): Room {
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();
    const room: Room = {
      code,
      mode,
      state: createInitialState(),
      inputs: { left: { ...DEFAULT_INPUT }, right: { ...DEFAULT_INPUT } },
      clients: new Map(),
      pointTimer: null,
      lastTick: Date.now(),
    };
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  join(code: string, client: Omit<RoomClient, "role">): { room: Room; role: ClientRole } | null {
    const room = this.get(code);
    if (!room) return null;
    const taken = new Set(
      [...room.clients.values()].filter((c) => c.role !== "spectator").map((c) => c.role)
    );
    let role: ClientRole = "spectator";
    if (!taken.has("left")) role = "left";
    else if (!taken.has("right")) role = "right";
    const full: RoomClient = { ...client, role };
    room.clients.set(client.id, full);
    return { room, role };
  }

  leave(code: string, clientId: string): void {
    const room = this.get(code);
    if (!room) return;
    room.clients.delete(clientId);
    if (room.clients.size === 0) this.rooms.delete(code);
  }

  setInput(room: Room, side: Side, partial: Partial<PlayerInput>): void {
    room.inputs[side] = { ...room.inputs[side], ...partial };
  }

  tick(room: Room, now = Date.now()): GameState {
    const dt = Math.min(0.033, Math.max(0.008, (now - room.lastTick) / 1000));
    room.lastTick = now;

    if (room.state.phase === "point") {
      if (room.pointTimer === null) room.pointTimer = now;
      if (now - room.pointTimer > 900) {
        continueAfterPoint(room.state);
        room.pointTimer = null;
        room.inputs = { left: { ...DEFAULT_INPUT }, right: { ...DEFAULT_INPUT } };
      }
      return serializeState(room.state);
    }

    room.pointTimer = null;
    step(room.state, room.inputs, dt);
    return serializeState(room.state);
  }

  broadcast(room: Room, payload: unknown): void {
    const msg = JSON.stringify(payload);
    for (const c of room.clients.values()) c.send(msg);
  }
}
