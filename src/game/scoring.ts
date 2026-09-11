import type { Score, Side } from "./types";

/** The player who did *not* let the ball drop on their court wins the rally. */
export function winnerFromBallLand(ballX: number, netX: number): Side {
  return ballX < netX ? "right" : "left";
}

export function otherSide(side: Side): Side {
  return side === "left" ? "right" : "left";
}

/** First player to reach `winScore` wins the match. */
export function matchWinnerOf(score: Score, winScore: number): Side | null {
  if (score.left >= winScore) return "left";
  if (score.right >= winScore) return "right";
  return null;
}

export function nextScore(score: Score, winner: Side): Score {
  return {
    left: score.left + (winner === "left" ? 1 : 0),
    right: score.right + (winner === "right" ? 1 : 0),
  };
}

export function isGamePoint(score: Score, winScore: number): Side | null {
  if (score.left === winScore - 1 && score.left >= score.right) return "left";
  if (score.right === winScore - 1 && score.right >= score.left) return "right";
  return null;
}

export function isValidWinScore(n: number): n is 15 | 25 {
  return n === 15 || n === 25;
}
