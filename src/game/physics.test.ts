import { describe, expect, it } from "vitest";
import { createInitialState } from "./engine";
import {
  BALL_BOUNCE,
  ballLanded,
  clamp,
  dist,
  GRAVITY,
  integrateBall,
  integratePlayer,
  resolvePlayerBall,
  sideBounds,
} from "./physics";
import { DEFAULT_INPUT, type BallState, type PlayerState } from "./types";

function ball(partial: Partial<BallState> = {}): BallState {
  return { x: 200, y: 200, vx: 0, vy: 0, radius: 16, ...partial };
}

describe("physics helpers", () => {
  it("clamps values inclusive of both ends", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-2, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });

  it("computes Euclidean distance", () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(dist({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(0);
  });

  it("keeps each player on their own side of the net", () => {
    const left = sideBounds("left", 960, 480);
    const right = sideBounds("right", 960, 480);
    expect(left.maxX).toBeLessThan(480);
    expect(right.minX).toBeGreaterThan(480);
    expect(left.minX).toBeGreaterThan(0);
    expect(right.maxX).toBeLessThan(960);
  });

  it("applies gravity and lands the player on the court floor", () => {
    const state = createInitialState();
    const p = state.players[0]!;
    p.y = state.groundY - 80;
    p.vy = 0;
    p.canJump = false;
    for (let i = 0; i < 90; i++) integratePlayer(p, 1 / 60, state);
    expect(p.y).toBe(state.groundY);
    expect(p.vy).toBe(0);
    expect(p.canJump).toBe(true);
  });

  it("does not let a left-side player walk through the net", () => {
    const state = createInitialState();
    const p = state.players[0]!;
    p.x = state.netX - 20;
    p.vx = 800;
    integratePlayer(p, 1 / 60, state);
    expect(p.x).toBeLessThan(state.netX);
    expect(p.x).toBeLessThanOrEqual(sideBounds("left", state.width, state.netX).maxX);
  });

  it("bounces the ball off the left wall with reduced speed", () => {
    const state = createInitialState();
    const b = ball({ x: 10, vx: -200, y: 120, vy: 0 });
    integrateBall(b, 1 / 60, state);
    expect(b.x).toBeGreaterThanOrEqual(b.radius);
    expect(b.vx).toBeGreaterThan(0);
    expect(b.vx).toBeLessThan(200 * BALL_BOUNCE + 1);
  });

  it("deflects the ball off the net instead of tunneling through", () => {
    const state = createInitialState();
    const b = ball({
      x: state.netX - 8,
      y: state.groundY - 40,
      vx: 400,
      vy: 0,
    });
    integrateBall(b, 1 / 60, state);
    expect(b.x + b.radius).toBeLessThanOrEqual(state.netX);
    expect(b.vx).toBeLessThan(0);
  });

  it("marks the ball as landed when it reaches the floor", () => {
    const state = createInitialState();
    const airborne = ball({ y: 100, radius: 16 });
    const onFloor = ball({ y: state.groundY - 16, radius: 16 });
    expect(ballLanded(airborne, state.groundY)).toBe(false);
    expect(ballLanded(onFloor, state.groundY)).toBe(true);
  });

  it("imparts an upward hit when a player contacts the ball", () => {
    const state = createInitialState();
    const player: PlayerState = { ...state.players[0]!, x: 200, y: state.groundY, vx: 50 };
    const b = ball({ x: 210, y: state.groundY - 50, vx: 0, vy: 200 });
    const hit = resolvePlayerBall(player, b, true);
    expect(hit).toBe(true);
    expect(b.vy).toBeLessThan(0);
  });

  it("gravity constant is positive so objects fall downward in screen space", () => {
    expect(GRAVITY).toBeGreaterThan(0);
    expect(DEFAULT_INPUT.hit).toBe(false);
  });
});
