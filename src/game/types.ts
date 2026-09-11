export type Side = "left" | "right";

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerState {
  id: string;
  side: Side;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  canJump: boolean;
}

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export type Phase = "serve" | "play" | "point" | "match_over";

export interface Score {
  left: number;
  right: number;
}

export interface GameState {
  width: number;
  height: number;
  groundY: number;
  netX: number;
  netHeight: number;
  players: PlayerState[];
  ball: BallState;
  score: Score;
  phase: Phase;
  servingSide: Side;
  pointWinner: Side | null;
  matchWinner: Side | null;
  winScore: number;
  tick: number;
}

export type InputAction = "left" | "right" | "jump" | "hit";

export interface PlayerInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  hit: boolean;
}

export const DEFAULT_INPUT: PlayerInput = {
  left: false,
  right: false,
  jump: false,
  hit: false,
};
