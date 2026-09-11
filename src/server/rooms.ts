import { randomBytes } from "crypto";
import { continueAfterPoint, createInitialState, resetMatch, serializeState, step } from "../game/engine";
import { isValidWinScore } from "../game/scoring";
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

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(len = 5): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  return out;
}

export function emptyInputs(): Record<Side, PlayerInput> {
  return { left: { ...DEFAULT_INPUT }, right: { ...DEFAULT_INPUT } };
}

export function hasBothPlayers(room: Room): boolean {
  const roles = new Set(
    [...room.clients.values()].filter((c) => c.role !== "spectator").map((c) => c.role)
  );
  return roles.has("left") && roles.has("right");
}

export class RoomManager {
  rooms = new Map<string, Room>();

  create(mode: "local" | "online" = "online", winScore = 15): Room {
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();
    const score = isValidWinScore(winScore) ? winScore : 15;
    const room: Room = {
      code,
      mode,
      state: createInitialState({ winScore: score }),
      inputs: emptyInputs(),
      clients: new Map(),
      pointTimer: null,
      lastTick: Date.now(),
    };
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.trim().toUpperCase());
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
    if (room.clients.size === 0) this.rooms.delete(code.toUpperCase());
  }

  setInput(room: Room, side: Side, partial: Partial<PlayerInput>): void {
    room.inputs[side] = { ...room.inputs[side], ...partial };
  }

  rematch(room: Room): void {
    resetMatch(room.state);
    room.inputs = emptyInputs();
    room.pointTimer = null;
    room.lastTick = Date.now();
  }

  tick(room: Room, now = Date.now()): GameState {
    const dt = Math.min(0.033, Math.max(0.008, (now - room.lastTick) / 1000));
    room.lastTick = now;

    if (room.mode === "online" && !hasBothPlayers(room) && room.state.phase !== "match_over") {
      return serializeState(room.state);
    }

    if (room.state.phase === "point") {
      if (room.pointTimer === null) room.pointTimer = now;
      if (now - room.pointTimer > 1100) {
        continueAfterPoint(room.state);
        room.pointTimer = null;
        room.inputs = emptyInputs();
      }
      return serializeState(room.state);
    }

    room.pointTimer = null;
    step(room.state, room.inputs, dt);
    room.inputs.left.hit = false;
    room.inputs.right.hit = false;
    return serializeState(room.state);
  }

  broadcast(room: Room, payload: unknown): void {
    const msg = JSON.stringify(payload);
    for (const c of room.clients.values()) c.send(msg);
  }
}
