import type { GameState, PlayerState, Side } from "../game/types.js";

export interface RenderExtras {
  role: Side | "spectator";
  mode: "local" | "online";
  waiting: boolean;
}

const LEFT_SKIN = "#f3c7a1";
const RIGHT_SKIN = "#e8b898";
const LEFT_JERSEY = "#ff6b4a";
const RIGHT_JERSEY = "#2ec4b6";

let ballSpin = 0;
const trail: { x: number; y: number }[] = [];

export function syncCanvasSize(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is required");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  const w = Math.max(1, Math.round(cssW * dpr));
  const h = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  state: GameState,
  extras: RenderExtras
): void {
  const sx = cssW / state.width;
  const sy = cssH / state.height;
  ctx.save();
  ctx.scale(sx, sy);

  drawSky(ctx, state);
  drawCrowd(ctx, state);
  drawCourt(ctx, state);
  drawNet(ctx, state);

  if (state.phase === "play") {
    trail.push({ x: state.ball.x, y: state.ball.y });
    if (trail.length > 10) trail.shift();
  } else {
    trail.length = 0;
  }
  drawTrail(ctx);
  ballSpin += state.ball.vx * 0.012;

  for (const p of state.players) drawShadow(ctx, p.x, state.groundY, 28, 10);
  drawShadow(ctx, state.ball.x, state.groundY, 14, 6);

  for (const p of state.players) drawPlayer(ctx, p, state);
  drawBall(ctx, state.ball.x, state.ball.y, state.ball.radius, ballSpin);

  drawPosts(ctx, state);

  if (state.phase === "serve" && !extras.waiting) {
    drawServeHint(ctx, state, extras);
  }

  ctx.restore();
}

function drawSky(ctx: CanvasRenderingContext2D, state: GameState): void {
  const g = ctx.createLinearGradient(0, 0, 0, state.height);
  g.addColorStop(0, "#1b2a4a");
  g.addColorStop(0.45, "#c45c38");
  g.addColorStop(0.72, "#e8a15a");
  g.addColorStop(1, "#f0c27a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.fillStyle = "#ffd38a";
  ctx.beginPath();
  ctx.arc(state.width * 0.82, 78, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 211, 138, 0.18)";
  ctx.beginPath();
  ctx.arc(state.width * 0.82, 78, 78, 0, Math.PI * 2);
  ctx.fill();
}

function drawCrowd(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = "rgba(18, 22, 38, 0.45)";
  ctx.fillRect(0, state.groundY - 188, state.width, 48);
  for (let i = 0; i < 42; i++) {
    const x = 18 + i * 23;
    const bob = Math.sin(state.tick * 0.08 + i) * 2;
    ctx.fillStyle = i % 3 === 0 ? "#3d4a6b" : i % 3 === 1 ? "#2a334d" : "#44507a";
    ctx.beginPath();
    ctx.arc(x, state.groundY - 168 + bob, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCourt(ctx: CanvasRenderingContext2D, state: GameState): void {
  const sand = ctx.createLinearGradient(0, state.groundY - 24, 0, state.height);
  sand.addColorStop(0, "#e2b86a");
  sand.addColorStop(1, "#c48a3c");
  ctx.fillStyle = sand;
  ctx.fillRect(0, state.groundY - 8, state.width, state.height - state.groundY + 8);

  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 3;
  ctx.strokeRect(36, state.groundY - 6, state.width - 72, 4);

  ctx.beginPath();
  ctx.moveTo(state.netX, state.groundY - 8);
  ctx.lineTo(state.netX, state.groundY + 10);
  ctx.stroke();

  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(state.width * 0.25, state.groundY - 6);
  ctx.lineTo(state.width * 0.25, state.groundY + 8);
  ctx.moveTo(state.width * 0.75, state.groundY - 6);
  ctx.lineTo(state.width * 0.75, state.groundY + 8);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(0,0,0,0.08)";
  for (let i = 0; i < 18; i++) {
    ctx.fillRect(20 + i * 52, state.groundY + 16 + (i % 2) * 6, 40, 3);
  }
}

function drawNet(ctx: CanvasRenderingContext2D, state: GameState): void {
  const top = state.groundY - state.netHeight;
  ctx.fillStyle = "rgba(230, 236, 255, 0.18)";
  ctx.fillRect(state.netX - 5, top, 10, state.netHeight);

  ctx.strokeStyle = "rgba(240, 246, 255, 0.55)";
  ctx.lineWidth = 1;
  for (let y = top + 8; y < state.groundY; y += 10) {
    ctx.beginPath();
    ctx.moveTo(state.netX - 5, y);
    ctx.lineTo(state.netX + 5, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "#f4f7ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(state.netX - 7, top);
  ctx.lineTo(state.netX + 7, top);
  ctx.stroke();
}

function drawPosts(ctx: CanvasRenderingContext2D, state: GameState): void {
  const top = state.groundY - state.netHeight;
  ctx.fillStyle = "#5b4630";
  ctx.fillRect(state.netX - 8, top - 8, 6, state.netHeight + 16);
  ctx.fillRect(state.netX + 2, top - 8, 6, state.netHeight + 16);
  ctx.fillStyle = "#d94f3d";
  ctx.fillRect(state.netX - 3, top - 18, 6, 14);
}

function drawShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  rx: number,
  ry: number
): void {
  ctx.fillStyle = "rgba(40, 24, 8, 0.28)";
  ctx.beginPath();
  ctx.ellipse(x, groundY + 4, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: PlayerState, state: GameState): void {
  const jersey = p.side === "left" ? LEFT_JERSEY : RIGHT_JERSEY;
  const skin = p.side === "left" ? LEFT_SKIN : RIGHT_SKIN;
  const airborne = p.y < state.groundY - 1;
  const bob = airborne ? 0 : Math.sin(state.tick * 0.25 + p.x * 0.02) * (Math.abs(p.vx) > 20 ? 3 : 0);
  const x = p.x;
  const y = p.y - 6 + bob;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(p.facing, 1);

  ctx.fillStyle = jersey;
  roundRect(ctx, -16, -52, 32, 38, 10);
  ctx.fill();

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, -64, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = p.side === "left" ? "#2b2118" : "#1c2830";
  ctx.beginPath();
  ctx.arc(0, -68, 13, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = "#1a1420";
  ctx.beginPath();
  ctx.arc(5, -64, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = skin;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(14, -42);
  ctx.lineTo(22, -28);
  ctx.stroke();

  ctx.fillStyle = "#2a241c";
  roundRect(ctx, -15, -16, 12, 16, 4);
  ctx.fill();
  roundRect(ctx, 3, -16, 12, 16, 4);
  ctx.fill();

  ctx.restore();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 12px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(p.side === "left" ? "1" : "2", p.x, p.y - 36);
}

function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, spin: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 4, 0, 0, r);
  g.addColorStop(0, "#fff6e8");
  g.addColorStop(1, "#e07a3d");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2b2118";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(8, 0, 0, r);
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(-8, 0, 0, r);
  ctx.moveTo(-r, 0);
  ctx.quadraticCurveTo(0, 6, r, 0);
  ctx.stroke();
  ctx.restore();
}

function drawTrail(ctx: CanvasRenderingContext2D): void {
  for (let i = 0; i < trail.length; i++) {
    const p = trail[i]!;
    ctx.fillStyle = `rgba(255, 180, 90, ${0.08 + i / trail.length * 0.18})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawServeHint(ctx: CanvasRenderingContext2D, state: GameState, extras: RenderExtras): void {
  const server = state.players.find((p) => p.side === state.servingSide);
  if (!server) return;
  const key =
    extras.mode === "local"
      ? state.servingSide === "left"
        ? "SPACE"
        : "ENTER"
      : extras.role === state.servingSide
        ? extras.role === "left"
          ? "SPACE or ENTER"
          : "SPACE or ENTER"
        : "waiting";
  if (extras.mode === "online" && extras.role !== state.servingSide && extras.role !== "spectator") return;

  ctx.fillStyle = "rgba(12, 16, 28, 0.72)";
  const label = extras.mode === "local" || extras.role === state.servingSide ? `SERVE — ${key}` : "OPPONENT SERVES";
  const boxW = Math.max(140, label.length * 7.2 + 20);
  roundRect(ctx, server.x - boxW / 2, server.y - 190, boxW, 28, 8);
  ctx.fill();
  ctx.fillStyle = "#ffe7c2";
  ctx.font = "bold 12px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, server.x, server.y - 171);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
