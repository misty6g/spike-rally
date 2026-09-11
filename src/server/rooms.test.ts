import { describe, expect, it } from "vitest";
import { CODE_ALPHABET, generateRoomCode, hasBothPlayers, RoomManager } from "./rooms";

describe("room manager", () => {
  it("generates 5-character codes from the unambiguous alphabet", () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(5);
    for (const ch of code) expect(CODE_ALPHABET).toContain(ch);
  });

  it("assigns left, then right, then spectator on join", () => {
    const mgr = new RoomManager();
    const room = mgr.create("online", 15);
    const a = mgr.join(room.code, { id: "a", send: () => {} });
    const b = mgr.join(room.code, { id: "b", send: () => {} });
    const c = mgr.join(room.code, { id: "c", send: () => {} });
    expect(a?.role).toBe("left");
    expect(b?.role).toBe("right");
    expect(c?.role).toBe("spectator");
    expect(hasBothPlayers(room)).toBe(true);
  });

  it("looks up rooms case-insensitively and deletes empty rooms on leave", () => {
    const mgr = new RoomManager();
    const room = mgr.create("local", 25);
    expect(mgr.get(room.code.toLowerCase())?.state.winScore).toBe(25);
    mgr.join(room.code, { id: "solo", send: () => {} });
    mgr.leave(room.code, "solo");
    expect(mgr.get(room.code)).toBeUndefined();
  });

  it("returns null when joining a missing room", () => {
    const mgr = new RoomManager();
    expect(mgr.join("ZZZZZ", { id: "x", send: () => {} })).toBeNull();
  });

  it("does not advance play in online rooms until both sides are seated", () => {
    const mgr = new RoomManager();
    const room = mgr.create("online", 15);
    mgr.join(room.code, { id: "a", send: () => {} });
    room.state.phase = "serve";
    const t0 = room.state.tick;
    mgr.setInput(room, "left", { hit: true });
    mgr.tick(room, Date.now() + 16);
    expect(room.state.phase).toBe("serve");
    expect(room.state.tick).toBe(t0);
  });

  it("rematch zeros the score", () => {
    const mgr = new RoomManager();
    const room = mgr.create("local");
    room.state.score = { left: 15, right: 11 };
    room.state.phase = "match_over";
    room.state.matchWinner = "left";
    mgr.rematch(room);
    expect(room.state.score).toEqual({ left: 0, right: 0 });
    expect(room.state.phase).toBe("serve");
  });
});
