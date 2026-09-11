import {
  ballTouchingGround,
  integrateBall,
  integratePlayer,
  resolvePlayerBall,
  sideBounds,
} from "./physics";
import {
  DEFAULT_INPUT,
  type GameState,
  type PlayerInput,
  type Side,
} from "./types";

export function createInitialState(opts?: {
  width?: number;
  height?: number;
  winScore?: number;
}): GameState {
  const width = opts?.width ?? 960;
  const height = opts?.height ?? 540;
  const groundY = height - 48;
  const netX = width / 2;
  const winScore = opts?.winScore ?? 7;

  const state: GameState = {
    width,
    height,
    groundY,
    netX,
    netHeight: 140,
    players: [
      {
        id: "P1",
        side: "left",
        x: width * 0.25,
        y: groundY,
        vx: 0,
        vy: 0,
        facing: 1,
        canJump: true,
      },
      {
        id: "P2",
        side: "right",
        x: width * 0.75,
        y: groundY,
        vx: 0,
        vy: 0,
        facing: -1,
        canJump: true,
      },
    ],
    ball: {
      x: width * 0.25,
      y: groundY - 160,
      vx: 0,
      vy: 0,
      radius: 16,
    },
    score: { left: 0, right: 0 },
    phase: "serve",
    servingSide: "left",
    pointWinner: null,
    matchWinner: null,
    winScore,
    tick: 0,
  };
  placeServe(state);
  return state;
}

export function placeServe(state: GameState): void {
  const server = state.players.find((p) => p.side === state.servingSide)!;
  state.ball.x = server.x;
  state.ball.y = state.groundY - 150;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.phase = "serve";
  state.pointWinner = null;
}

export function resetPositions(state: GameState): void {
  for (const p of state.players) {
    const bounds = sideBounds(p.side, state.width, state.netX);
    p.x = (bounds.minX + bounds.maxX) / 2;
    p.y = state.groundY;
    p.vx = 0;
    p.vy = 0;
    p.canJump = true;
  }
  placeServe(state);
}

export function applyInput(
  state: GameState,
  side: Side,
  input: PlayerInput,
  dt: number
): void {
  const player = state.players.find((p) => p.side === side);
  if (!player || state.phase === "match_over" || state.phase === "point") return;

  player.vx = 0;
  if (input.left) {
    player.vx = -320;
    player.facing = -1;
  }
  if (input.right) {
    player.vx = 320;
    player.facing = 1;
  }
  if (input.jump && player.canJump) {
    player.vy = -620;
    player.canJump = false;
  }

  if (state.phase === "serve" && state.servingSide === side && input.hit) {
    const dir = side === "left" ? 1 : -1;
    state.ball.vx = dir * 280;
    state.ball.vy = -420;
    state.phase = "play";
    return;
  }

  if (state.phase === "play" && input.hit) {
    resolvePlayerBall(player, state.ball, true);
  }
}

export function step(
  state: GameState,
  inputs: Record<Side, PlayerInput>,
  dt: number
): GameState {
  if (state.phase === "match_over") return state;

  if (state.phase === "point") {
    return state;
  }

  applyInput(state, "left", inputs.left ?? DEFAULT_INPUT, dt);
  applyInput(state, "right", inputs.right ?? DEFAULT_INPUT, dt);

  for (const p of state.players) integratePlayer(p, dt, state);

  if (state.phase === "play") {
    integrateBall(state.ball, dt, state);
    for (const p of state.players) {
      resolvePlayerBall(p, state.ball, false);
    }

    if (ballTouchingGround(state.ball, state.groundY)) {
      const winner: Side = state.ball.x < state.netX ? "right" : "left";
      awardPoint(state, winner);
    }
  }

  state.tick += 1;
  return state;
}

export function awardPoint(state: GameState, winner: Side): void {
  if (state.phase === "match_over") return;
  state.score[winner] += 1;
  state.pointWinner = winner;
  state.phase = "point";
  state.servingSide = winner;
  if (state.score[winner] >= state.winScore) {
    state.matchWinner = winner;
    state.phase = "match_over";
  }
}

export function continueAfterPoint(state: GameState): void {
  if (state.phase !== "point") return;
  resetPositions(state);
}

export function serializeState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}
