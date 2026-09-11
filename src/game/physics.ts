import type { BallState, GameState, PlayerState, Side, Vec2 } from "./types";

export const GRAVITY = 1800;
export const PLAYER_SPEED = 320;
export const JUMP_VELOCITY = -620;
export const HIT_IMPULSE = 520;
export const BALL_BOUNCE = 0.78;
export const FRICTION = 0.86;
export const AIR_DRAG = 0.995;
export const PLAYER_BODY_OFFSET = 28;
export const PLAYER_REACH = 34;
export const NET_HALF_WIDTH = 6;

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function sideBounds(side: Side, width: number, netX: number): { minX: number; maxX: number } {
  if (side === "left") return { minX: 28, maxX: netX - 18 };
  return { minX: netX + 18, maxX: width - 28 };
}

export function playerCenter(p: PlayerState): Vec2 {
  return { x: p.x, y: p.y - PLAYER_BODY_OFFSET };
}

export function integratePlayer(p: PlayerState, dt: number, state: GameState): void {
  p.vy += GRAVITY * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  const bounds = sideBounds(p.side, state.width, state.netX);
  p.x = clamp(p.x, bounds.minX, bounds.maxX);

  if (p.y >= state.groundY) {
    p.y = state.groundY;
    p.vy = 0;
    p.canJump = true;
  } else {
    p.canJump = false;
  }
}

export function integrateBall(ball: BallState, dt: number, state: GameState): void {
  ball.vy += GRAVITY * dt;
  ball.vx *= AIR_DRAG;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx = Math.abs(ball.vx) * BALL_BOUNCE;
  }
  if (ball.x + ball.radius > state.width) {
    ball.x = state.width - ball.radius;
    ball.vx = -Math.abs(ball.vx) * BALL_BOUNCE;
  }

  const netLeft = state.netX - NET_HALF_WIDTH;
  const netRight = state.netX + NET_HALF_WIDTH;
  const netTop = state.groundY - state.netHeight;
  const hitsNet =
    ball.x + ball.radius > netLeft &&
    ball.x - ball.radius < netRight &&
    ball.y + ball.radius > netTop &&
    ball.y - ball.radius < state.groundY;

  if (hitsNet) {
    const hittingFromAbove = ball.y < netTop + ball.radius && ball.vy > 0;
    if (hittingFromAbove) {
      ball.y = netTop - ball.radius;
      ball.vy = -Math.abs(ball.vy) * BALL_BOUNCE;
    } else if (ball.x < state.netX) {
      ball.x = netLeft - ball.radius;
      ball.vx = -Math.abs(ball.vx) * BALL_BOUNCE;
    } else {
      ball.x = netRight + ball.radius;
      ball.vx = Math.abs(ball.vx) * BALL_BOUNCE;
    }
  }

  if (ball.y + ball.radius >= state.groundY) {
    ball.y = state.groundY - ball.radius;
    ball.vy = -Math.abs(ball.vy) * BALL_BOUNCE;
    ball.vx *= FRICTION;
  }
}

export function resolvePlayerBall(player: PlayerState, ball: BallState, hitBoost: boolean): boolean {
  const center = playerCenter(player);
  const d = dist(center, { x: ball.x, y: ball.y });
  const reach = ball.radius + PLAYER_REACH;
  if (d > reach || d === 0) return false;

  const nx = (ball.x - center.x) / d;
  const ny = (ball.y - center.y) / d;
  const impulse = hitBoost ? HIT_IMPULSE * 1.35 : HIT_IMPULSE;
  ball.vx = nx * impulse + player.vx * 0.35;
  ball.vy = Math.min(-280, ny * impulse + player.vy * 0.2);
  ball.x = center.x + nx * (reach + 1);
  ball.y = center.y + ny * (reach + 1);
  return true;
}

export function ballLanded(ball: BallState, groundY: number, eps = 0.5): boolean {
  return ball.y + ball.radius >= groundY - eps;
}
