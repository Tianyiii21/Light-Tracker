export interface LanternConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string; // "rgb(r,g,b)" format
  opacity: number;
  glowRadius?: number;
}

function parseRgb(color: string): [number, number, number] {
  const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return [215, 165, 75];
  return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
}

export function drawLantern(
  ctx: CanvasRenderingContext2D,
  cfg: LanternConfig
) {
  const { x, y, width: w, height: h, color, opacity, glowRadius } = cfg;
  const [r, g, b] = parseRgb(color);
  const hw = w / 2;
  const hh = h / 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = opacity;

  // Outer atmospheric glow
  const gr = glowRadius ?? hw * 5;
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, gr);
  glow.addColorStop(0, `rgba(${r},${g},${b},0.35)`);
  glow.addColorStop(0.5, `rgba(${r},${g},${b},0.1)`);
  glow.addColorStop(1, `rgba(0,0,0,0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, gr, 0, Math.PI * 2);
  ctx.fill();

  // Lantern body — barrel shape with bezier curves (wider at middle)
  ctx.beginPath();
  ctx.moveTo(0, -hh);
  // top to right middle
  ctx.bezierCurveTo(hw * 0.55, -hh, hw, -hh * 0.5, hw, 0);
  // right middle to bottom right
  ctx.bezierCurveTo(hw, hh * 0.5, hw * 0.75, hh, 0, hh);
  // bottom right to left middle
  ctx.bezierCurveTo(-hw * 0.75, hh, -hw, hh * 0.5, -hw, 0);
  // left middle to top
  ctx.bezierCurveTo(-hw, -hh * 0.5, -hw * 0.55, -hh, 0, -hh);
  ctx.closePath();

  // Body fill — inner glow effect
  const bodyGrad = ctx.createRadialGradient(-hw * 0.15, -hh * 0.3, 0, 0, 0, Math.max(hw, hh) * 1.4);
  bodyGrad.addColorStop(0, `rgba(${Math.min(255, r + 60)},${Math.min(255, g + 40)},${Math.min(255, b + 20)},0.95)`);
  bodyGrad.addColorStop(0.5, `rgba(${r},${g},${b},0.85)`);
  bodyGrad.addColorStop(1, `rgba(${Math.max(0, r - 40)},${Math.max(0, g - 40)},${Math.max(0, b - 30)},0.65)`);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Subtle body outline
  ctx.strokeStyle = `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 60)},${Math.min(255, b + 30)},0.4)`;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Top cap — small flat ellipse suggesting folded paper crown
  ctx.beginPath();
  ctx.ellipse(0, -hh, hw * 0.45, hw * 0.12, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${Math.min(255, r + 30)},${Math.min(255, g + 20)},${b},0.9)`;
  ctx.fill();

  // Bottom opening — wide ellipse, open mouth of lantern
  ctx.beginPath();
  ctx.ellipse(0, hh, hw * 0.85, hw * 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${Math.max(0, r - 30)},${Math.max(0, g - 30)},${Math.max(0, b - 20)},0.75)`;
  ctx.fill();

  // Wire detail — thin cross inside bottom opening
  ctx.strokeStyle = `rgba(${Math.min(255, r + 60)},${Math.min(255, g + 40)},${b},0.35)`;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-hw * 0.75, hh);
  ctx.lineTo(hw * 0.75, hh);
  ctx.stroke();

  // Flame — warm amber teardrop just below bottom opening
  const flameY = hh + hw * 0.45;
  const flameH = hw * 0.55;
  ctx.beginPath();
  ctx.moveTo(0, flameY + flameH * 0.5);
  ctx.bezierCurveTo(hw * 0.2, flameY + flameH * 0.1, hw * 0.22, flameY - flameH * 0.3, 0, flameY - flameH * 0.5);
  ctx.bezierCurveTo(-hw * 0.22, flameY - flameH * 0.3, -hw * 0.2, flameY + flameH * 0.1, 0, flameY + flameH * 0.5);
  ctx.fillStyle = `rgba(255, 200, 80, 0.95)`;
  ctx.fill();

  // Flame glow
  const flameGlow = ctx.createRadialGradient(0, flameY, 0, 0, flameY, hw * 1.2);
  flameGlow.addColorStop(0, `rgba(255, 220, 100, 0.5)`);
  flameGlow.addColorStop(1, `rgba(0,0,0,0)`);
  ctx.fillStyle = flameGlow;
  ctx.beginPath();
  ctx.arc(0, flameY, hw * 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
