import { DEFAULT_INPUT, type PlayerInput, type Side } from "../game/types.js";

const P1 = {
  left: new Set(["KeyA", "a"]),
  right: new Set(["KeyD", "d"]),
  jump: new Set(["KeyW", "w"]),
  hit: new Set(["Space", " "]),
};

const P2 = {
  left: new Set(["ArrowLeft"]),
  right: new Set(["ArrowRight"]),
  jump: new Set(["ArrowUp"]),
  hit: new Set(["Enter"]),
};

export interface InputSnapshot {
  left: PlayerInput;
  right: PlayerInput;
  combined: PlayerInput;
}

function empty(): PlayerInput {
  return { ...DEFAULT_INPUT };
}

export function createKeyboard(): {
  snapshot: () => InputSnapshot;
  dispose: () => void;
} {
  const down = new Set<string>();

  const onDown = (e: KeyboardEvent) => {
    const keys = ["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"];
    if (keys.includes(e.code) || e.key === " ") e.preventDefault();
    down.add(e.code);
    down.add(e.key);
  };
  const onUp = (e: KeyboardEvent) => {
    down.delete(e.code);
    down.delete(e.key);
  };

  window.addEventListener("keydown", onDown);
  window.addEventListener("keyup", onUp);
  window.addEventListener("blur", () => down.clear());

  const read = (map: typeof P1): PlayerInput => ({
    left: [...map.left].some((k) => down.has(k)),
    right: [...map.right].some((k) => down.has(k)),
    jump: [...map.jump].some((k) => down.has(k)),
    hit: [...map.hit].some((k) => down.has(k)),
  });

  return {
    snapshot: () => {
      const left = read(P1);
      const right = read(P2);
      const combined: PlayerInput = {
        left: left.left || right.left,
        right: left.right || right.right,
        jump: left.jump || right.jump,
        hit: left.hit || right.hit,
      };
      return { left, right, combined };
    },
    dispose: () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    },
  };
}

export function sideFromRole(role: Side | "spectator"): Side | null {
  return role === "left" || role === "right" ? role : null;
}

export { empty };
