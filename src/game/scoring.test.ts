import { describe, expect, it } from "vitest";
import {
  isGamePoint,
  isValidWinScore,
  matchWinnerOf,
  nextScore,
  otherSide,
  winnerFromBallLand,
} from "./scoring";

describe("scoring math", () => {
  it("awards the point to the opponent of the court where the ball lands", () => {
    expect(winnerFromBallLand(100, 480)).toBe("right");
    expect(winnerFromBallLand(479, 480)).toBe("right");
    expect(winnerFromBallLand(480, 480)).toBe("left");
    expect(winnerFromBallLand(900, 480)).toBe("left");
  });

  it("increments only the winner's score", () => {
    expect(nextScore({ left: 4, right: 7 }, "left")).toEqual({ left: 5, right: 7 });
    expect(nextScore({ left: 14, right: 14 }, "right")).toEqual({ left: 14, right: 15 });
  });

  it("declares a match winner at 15 or 25, not before", () => {
    expect(matchWinnerOf({ left: 14, right: 10 }, 15)).toBeNull();
    expect(matchWinnerOf({ left: 15, right: 10 }, 15)).toBe("left");
    expect(matchWinnerOf({ left: 24, right: 24 }, 25)).toBeNull();
    expect(matchWinnerOf({ left: 20, right: 25 }, 25)).toBe("right");
  });

  it("flags game point when a side sits one away from the target", () => {
    expect(isGamePoint({ left: 14, right: 9 }, 15)).toBe("left");
    expect(isGamePoint({ left: 12, right: 14 }, 15)).toBe("right");
    expect(isGamePoint({ left: 13, right: 13 }, 15)).toBeNull();
    expect(isGamePoint({ left: 24, right: 20 }, 25)).toBe("left");
  });

  it("only allows official rally targets of 15 and 25", () => {
    expect(isValidWinScore(15)).toBe(true);
    expect(isValidWinScore(25)).toBe(true);
    expect(isValidWinScore(7)).toBe(false);
    expect(isValidWinScore(21)).toBe(false);
  });

  it("maps a side to its opponent", () => {
    expect(otherSide("left")).toBe("right");
    expect(otherSide("right")).toBe("left");
  });
});
