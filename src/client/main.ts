import { createKeyboard, sideFromRole } from "./input.js";
import { connect, type ServerMsg, type Session } from "./net.js";
import { renderFrame, syncCanvasSize } from "./render.js";
import { isGamePoint } from "../game/scoring.js";
import type { GameState, Side } from "../game/types.js";

const menuEl = document.getElementById("menu")!;
const gameEl = document.getElementById("game")!;
const canvas = document.getElementById("court") as HTMLCanvasElement;
const overlay = document.getElementById("overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayBody = document.getElementById("overlay-body")!;
const statusEl = document.getElementById("match-status")!;
const scoreLeft = document.getElementById("score-left")!;
const scoreRight = document.getElementById("score-right")!;
const rallyEl = document.getElementById("rally")!;
const roomCodeEl = document.getElementById("room-code")!;
const roleEl = document.getElementById("role-chip")!;
const winTargetEl = document.getElementById("win-target")!;
const errorEl = document.getElementById("menu-error")!;
const joinInput = document.getElementById("join-code") as HTMLInputElement;
const rematchBtn = document.getElementById("btn-rematch") as HTMLButtonElement;

let session: Session | null = null;
let prevHit = { left: false, right: false, combined: false };
let state: GameState | null = null;
let role: Side | "spectator" = "spectator";
let mode: "local" | "online" = "local";
let waiting = false;
let winScoreChoice = 15;
const keyboard = createKeyboard();

function selectedWinScore(): number {
  const checked = document.querySelector<HTMLInputElement>('input[name="win-score"]:checked');
  return checked?.value === "25" ? 25 : 15;
}

function showError(msg: string): void {
  errorEl.textContent = msg;
  errorEl.hidden = !msg;
}

function ensureSession(then: (s: Session) => void): void {
  if (session && session.ws.readyState === WebSocket.OPEN) {
    then(session);
    return;
  }
  session?.close();
  session = connect(handleServer, (status) => {
    if (status === "disconnected" && !menuEl.hidden) return;
    if (status === "disconnected") {
      overlay.hidden = false;
      overlayTitle.textContent = "Disconnected";
      overlayBody.textContent = "Refresh the page to reconnect.";
    }
  });
  const s = session;
  const waitOpen = () => {
    if (s.ws.readyState === WebSocket.OPEN) then(s);
    else if (s.ws.readyState === WebSocket.CONNECTING) setTimeout(waitOpen, 30);
    else showError("Could not connect to the game server.");
  };
  waitOpen();
}

function handleServer(msg: ServerMsg): void {
  if (msg.type === "error") {
    showError(msg.message);
    return;
  }
  if (msg.type === "joined") {
    role = msg.role;
    mode = msg.mode;
    state = msg.state;
    waiting = Boolean(msg.waiting);
    menuEl.hidden = true;
    gameEl.hidden = false;
    roomCodeEl.textContent = msg.code;
    roleEl.textContent =
      mode === "local" ? "LOCAL · both keyboards" : msg.role === "spectator" ? "SPECTATING" : `YOU · ${msg.role.toUpperCase()}`;
    winTargetEl.textContent = `FIRST TO ${msg.state.winScore}`;
    overlay.hidden = true;
    showError("");
    updateHud();
    return;
  }
  if (msg.type === "state") {
    state = msg.state;
    waiting = Boolean(msg.waiting);
    updateHud();
    return;
  }
  if (msg.type === "peer") {
    waiting = Boolean(msg.waiting);
    updateHud();
  }
}

function updateHud(): void {
  if (!state) return;
  scoreLeft.textContent = String(state.score.left);
  scoreRight.textContent = String(state.score.right);
  rallyEl.textContent = state.rallyHits > 0 ? `RALLY ${state.rallyHits}` : "RALLY —";

  const gp = isGamePoint(state.score, state.winScore);
  if (waiting) {
    statusEl.textContent = `Waiting for opponent · share code ${roomCodeEl.textContent}`;
  } else if (state.phase === "match_over" && state.matchWinner) {
    statusEl.textContent = `${state.matchWinner.toUpperCase()} WINS THE MATCH`;
  } else if (state.phase === "point" && state.pointWinner) {
    statusEl.textContent = `${state.pointWinner.toUpperCase()} TAKES THE POINT`;
  } else if (state.phase === "serve") {
    statusEl.textContent = `${state.servingSide.toUpperCase()} TO SERVE`;
  } else if (gp) {
    statusEl.textContent = `GAME POINT · ${gp.toUpperCase()}`;
  } else {
    statusEl.textContent = "IN PLAY";
  }

  if (state.phase === "match_over" && state.matchWinner) {
    overlay.hidden = false;
    overlayTitle.textContent = state.matchWinner === "left" ? "LEFT WINS" : "RIGHT WINS";
    overlayBody.textContent = `${state.score.left}  —  ${state.score.right}`;
  } else if (waiting) {
    overlay.hidden = false;
    overlayTitle.textContent = "Waiting for opponent";
    overlayBody.textContent = `Room ${roomCodeEl.textContent} · first to ${state.winScore}`;
  } else {
    overlay.hidden = true;
  }
  rematchBtn.hidden = state.phase !== "match_over";
}

function sendInputs(): void {
  if (!session || !state || waiting || state.phase === "match_over") return;
  const snap = keyboard.snapshot();
  if (mode === "local") {
    session.send({
      type: "input",
      side: "left",
      input: { ...snap.left, hit: snap.left.hit && !prevHit.left },
    });
    session.send({
      type: "input",
      side: "right",
      input: { ...snap.right, hit: snap.right.hit && !prevHit.right },
    });
    prevHit.left = snap.left.hit;
    prevHit.right = snap.right.hit;
    return;
  }
  const mine = sideFromRole(role);
  if (!mine) return;
  session.send({
    type: "input",
    input: { ...snap.combined, hit: snap.combined.hit && !prevHit.combined },
  });
  prevHit.combined = snap.combined.hit;
}

function loop(): void {
  const ctx = syncCanvasSize(canvas);
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (state) {
    renderFrame(ctx, cssW, cssH, state, { role, mode, waiting });
    sendInputs();
  } else {
    ctx.fillStyle = "#1b2a4a";
    ctx.fillRect(0, 0, cssW, cssH);
  }
  requestAnimationFrame(loop);
}

function startLocal(): void {
  winScoreChoice = selectedWinScore();
  ensureSession((s) => s.send({ type: "create", mode: "local", winScore: winScoreChoice }));
}

function createOnline(): void {
  winScoreChoice = selectedWinScore();
  ensureSession((s) => s.send({ type: "create", mode: "online", winScore: winScoreChoice }));
}

function joinOnline(): void {
  const code = joinInput.value.trim().toUpperCase();
  if (code.length < 4) {
    showError("Enter a room code to join.");
    return;
  }
  ensureSession((s) => s.send({ type: "join", code }));
}

document.getElementById("btn-local")!.addEventListener("click", startLocal);
document.getElementById("btn-create")!.addEventListener("click", createOnline);
document.getElementById("btn-join")!.addEventListener("click", joinOnline);
joinInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") joinOnline();
});

document.getElementById("btn-copy")!.addEventListener("click", async () => {
  const code = roomCodeEl.textContent ?? "";
  try {
    await navigator.clipboard.writeText(code);
  } catch {
    /* clipboard may be blocked */
  }
});

document.getElementById("btn-rematch")!.addEventListener("click", () => {
  session?.send({ type: "rematch" });
});

document.getElementById("btn-menu")!.addEventListener("click", () => {
  session?.close();
  session = null;
  state = null;
  gameEl.hidden = true;
  menuEl.hidden = false;
  overlay.hidden = true;
});

const params = new URLSearchParams(location.search);
if (params.get("to") === "25") {
  const radio = document.querySelector<HTMLInputElement>('input[name="win-score"][value="25"]');
  if (radio) radio.checked = true;
}
if (params.get("local") === "1") {
  window.addEventListener("load", () => startLocal());
} else if (params.get("room")) {
  joinInput.value = params.get("room")!.toUpperCase();
  window.addEventListener("load", () => joinOnline());
}

loop();
