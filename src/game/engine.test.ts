import { describe, expect, it } from "vitest";
import {
  applyInput,
  awardPoint,
  continueAfterPoint,
  createInitialState,
  resetMatch,
  step,
} from "./engine";
import { DEFAULT_INPUT, type PlayerInput } from "./types";

const idle: PlayerInput = { ...DEFAULT_INPUT };
const bothIdle = { left: idle, right: idle };

describe("game engine", () => {
  it("starts in serve phase with a 15-point match by default", () => {
    const s = createInitialState();
    expect(s.phase).toBe("serve");
    expect(s.winScore).toBe(15);
    expect(s.score).toEqual({ left: 0, right: 0 });
    expect(s.servingSide).toBe("left");
    expect(s.players).toHaveLength(2);
  });

  it("accepts a 25-point match target", () => {
    const s = createInitialState({ winScore: 25 });
    expect(s.winScore).toBe(25);
  });

  it("falls back to 15 when given an invalid win score", () => {
    const s = createInitialState({ winScore: 7 });
    expect(s.winScore).toBe(15);
  });

  it("lets the serving player put the ball in play with a hit", () => {
    const s = createInitialState();
    step(s, { left: { ...idle, hit: true }, right: idle }, 1 / 60);
    expect(s.phase).toBe("play");
    expect(s.ball.vx).toBeGreaterThan(0);
    expect(s.ball.vy).toBeLessThan(0);
  });

  it("ignores a hit from the receiving side during serve", () => {
    const s = createInitialState();
    applyInput(s, "right", { ...idle, hit: true });
    expect(s.phase).toBe("serve");
    expect(s.ball.vx).toBe(0);
  });

  it("keeps the ball above the server until the serve is struck", () => {
    const s = createInitialState();
    const startY = s.ball.y;
    step(s, { left: { ...idle, right: true }, right: idle }, 1 / 60);
    expect(s.phase).toBe("serve");
    expect(s.ball.y).toBe(startY);
    expect(s.ball.x).toBeCloseTo(s.players[0]!.x + s.players[0]!.facing * 10, 5);
  });

  it("awards a point when the ball lands and switches serve to the winner", () => {
    const s = createInitialState();
    s.phase = "play";
    s.ball.x = 80;
    s.ball.y = s.groundY - s.ball.radius;
    s.ball.vx = 0;
    s.ball.vy = 50;
    step(s, bothIdle, 1 / 60);
    expect(s.pointWinner).toBe("right");
    expect(s.score.right).toBe(1);
    expect(s.servingSide).toBe("right");
    expect(s.phase).toBe("point");
  });

  it("ends the match when a side reaches the win score", () => {
    const s = createInitialState({ winScore: 15 });
    s.score = { left: 14, right: 8 };
    awardPoint(s, "left");
    expect(s.matchWinner).toBe("left");
    expect(s.phase).toBe("match_over");
    expect(s.score.left).toBe(15);
  });

  it("does not double-count after a point is already awarded", () => {
    const s = createInitialState();
    awardPoint(s, "left");
    awardPoint(s, "left");
    expect(s.score.left).toBe(1);
  });

  it("resets positions after a point but keeps the score", () => {
    const s = createInitialState();
    s.score = { left: 3, right: 2 };
    s.phase = "point";
    s.pointWinner = "left";
    s.servingSide = "left";
    s.players[0]!.x = 40;
    continueAfterPoint(s);
    expect(s.phase).toBe("serve");
    expect(s.score).toEqual({ left: 3, right: 2 });
    expect(s.players[0]!.x).toBeGreaterThan(40);
  });

  it("does not move players after the match is over", () => {
    const s = createInitialState();
    s.phase = "match_over";
    s.matchWinner = "right";
    const x = s.players[0]!.x;
    step(s, { left: { ...idle, right: true }, right: idle }, 1 / 60);
    expect(s.players[0]!.x).toBe(x);
  });

  it("resetMatch clears the board for a rematch", () => {
    const s = createInitialState({ winScore: 25 });
    s.score = { left: 25, right: 19 };
    s.phase = "match_over";
    s.matchWinner = "left";
    resetMatch(s);
    expect(s.score).toEqual({ left: 0, right: 0 });
    expect(s.phase).toBe("serve");
    expect(s.matchWinner).toBeNull();
    expect(s.winScore).toBe(25);
    expect(s.servingSide).toBe("left");
  });

  it("lets a grounded player jump on the jump input", () => {
    const s = createInitialState();
    const p = s.players[0]!;
    expect(p.canJump).toBe(true);
    applyInput(s, "left", { ...idle, jump: true });
    expect(p.vy).toBeLessThan(0);
    expect(p.canJump).toBe(false);
  });
});
