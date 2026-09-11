import {
  ballLanded,
  integrateBall,
  integratePlayer,
  JUMP_VELOCITY,
  PLAYER_SPEED,
  resolvePlayerBall,
  sideBounds,
} from "./physics";
import { isValidWinScore, matchWinnerOf, nextScore, winnerFromBallLand } from "./scoring";
import {
  DEFAULT_INPUT,
  type GameState,
  type PlayerInput,
  type Side,
  type WinScore,
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
  const requested = opts?.winScore ?? 15;
  const winScore: WinScore = isValidWinScore(requested) ? requested : 15;

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
    rallyHits: 0,
    tick: 0,
  };
  placeServe(state);
  return state;
}

export function placeServe(state: GameState): void {
  const server = state.players.find((p) => p.side === state.servingSide);
  if (!server) return;
  state.ball.x = server.x + server.facing * 10;
  state.ball.y = server.y - 150;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.phase = "serve";
  state.pointWinner = null;
  state.rallyHits = 0;
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

export function resetMatch(state: GameState): void {
  state.score = { left: 0, right: 0 };
  state.matchWinner = null;
  state.pointWinner = null;
  state.servingSide = "left";
  state.rallyHits = 0;
  resetPositions(state);
}

export function applyInput(state: GameState, side: Side, input: PlayerInput): void {
  const player = state.players.find((p) => p.side === side);
  if (!player || state.phase === "match_over" || state.phase === "point") return;

  player.vx = 0;
  if (input.left) {
    player.vx = -PLAYER_SPEED;
    player.facing = -1;
  }
  if (input.right) {
    player.vx = PLAYER_SPEED;
    player.facing = 1;
  }
  if (input.left && input.right) player.vx = 0;
  if (input.jump && player.canJump) {
    player.vy = JUMP_VELOCITY;
    player.canJump = false;
  }

  if (state.phase === "serve" && state.servingSide === side && input.hit) {
    const dir = side === "left" ? 1 : -1;
    state.ball.vx = dir * 280 + player.vx * 0.4;
    state.ball.vy = -420;
    state.phase = "play";
    state.rallyHits = 0;
    return;
  }

  if (state.phase === "play" && input.hit) {
    if (resolvePlayerBall(player, state.ball, true)) state.rallyHits += 1;
  }
}

export function step(
  state: GameState,
  inputs: Record<Side, PlayerInput>,
  dt: number
): GameState {
  if (state.phase === "match_over" || state.phase === "point") return state;

  applyInput(state, "left", inputs.left ?? DEFAULT_INPUT);
  applyInput(state, "right", inputs.right ?? DEFAULT_INPUT);

  for (const p of state.players) integratePlayer(p, dt, state);

  if (state.phase === "serve") {
    const server = state.players.find((p) => p.side === state.servingSide);
    if (server) {
      state.ball.x = server.x + server.facing * 10;
      state.ball.y = server.y - 150;
      state.ball.vx = 0;
      state.ball.vy = 0;
    }
  }

  if (state.phase === "play") {
    integrateBall(state.ball, dt, state);
    for (const p of state.players) {
      if (resolvePlayerBall(p, state.ball, false)) state.rallyHits += 1;
    }

    if (ballLanded(state.ball, state.groundY)) {
      awardPoint(state, winnerFromBallLand(state.ball.x, state.netX));
    }
  }

  state.tick += 1;
  return state;
}

export function awardPoint(state: GameState, winner: Side): void {
  if (state.phase === "match_over" || state.phase === "point") return;
  state.score = nextScore(state.score, winner);
  state.pointWinner = winner;
  state.servingSide = winner;
  const matchWinner = matchWinnerOf(state.score, state.winScore);
  if (matchWinner) {
    state.matchWinner = matchWinner;
    state.phase = "match_over";
  } else {
    state.phase = "point";
  }
}

export function continueAfterPoint(state: GameState): void {
  if (state.phase !== "point") return;
  resetPositions(state);
}

export function serializeState(state: GameState): GameState {
  return structuredClone(state);
}
