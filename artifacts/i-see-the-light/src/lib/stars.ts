// Shared star system — three-style twinkling with asymmetric fade and position shimmer.
// Module-level arrays are created ONCE at import time and mutated only by the animation loop.

export interface StarData {
  xFrac: number;        // [0,1] — used to rescale on resize
  yFrac: number;        // [0, skyFraction]
  baseX: number;        // current logical-pixel anchor (updated on resize)
  baseY: number;
  radius: number;
  phase: number;        // incremented each frame
  speed: number;        // rad/frame (varied per star)
  peakOpacity: number;  // 0.5–1.0
  dimOpacity: number;   // 0.05–0.15
  shimmerRadius: number;  // 0 for 60% of stars; 1.2–2.0 for the rest
  shimmerPhase: number;
  shimmerSpeed: number;
  style: 0 | 1 | 2;    // 0=rare slow blinker, 1=medium, 2=sharp frequent
}

function randomStyle(): 0 | 1 | 2 {
  const r = Math.random();
  if (r < 0.25) return 0;   // 25% rare slow
  if (r < 0.75) return 1;   // 50% medium
  return 2;                  // 25% sharp frequent
}

export function createStars(count: number, skyFraction = 0.75): StarData[] {
  const w = typeof window !== "undefined" ? window.innerWidth || 375 : 375;
  const h = typeof window !== "undefined" ? window.innerHeight || 812 : 812;
  return Array.from({ length: count }, () => {
    const xFrac = Math.random();
    const yFrac = Math.random() * skyFraction;
    return {
      xFrac,
      yFrac,
      baseX: xFrac * w,
      baseY: yFrac * h,
      radius: 0.4 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.018 + Math.random() * 0.035,
      peakOpacity: 0.5 + Math.random() * 0.5,
      dimOpacity: 0.05 + Math.random() * 0.1,
      shimmerRadius: Math.random() < 0.4 ? 1.2 + Math.random() * 0.8 : 0,
      shimmerPhase: Math.random() * Math.PI * 2,
      shimmerSpeed: 0.025 + Math.random() * 0.02,
      style: randomStyle(),
    };
  });
}

/** Call on every window resize to reposition stars relative to new canvas size. */
export function resizeStars(stars: StarData[], w: number, h: number): void {
  for (const s of stars) {
    s.baseX = s.xFrac * w;
    s.baseY = s.yFrac * h;
  }
}

/** Draw a single star — call every animation frame. Mutates star.phase and shimmerPhase. */
export function drawStar(ctx: CanvasRenderingContext2D, star: StarData): void {
  star.phase += star.speed;
  star.shimmerPhase += star.shimmerSpeed;

  // Asymmetric twinkling: sharp bright spike, slow fade back to dim.
  // raw ∈ [-1,1] → max(raw,0) ∈ [0,1] → pow(0.4) → spends most time near 0 (dim).
  const raw = Math.sin(star.phase);
  const shaped = Math.pow(Math.max(raw, 0), 0.4);
  const opacity = star.dimOpacity + (star.peakOpacity - star.dimOpacity) * shaped;

  let finalOpacity = opacity;
  if (star.style === 0) {
    // Rare slow blinker — lights up only occasionally
    finalOpacity = opacity * (0.3 + 0.7 * Math.max(Math.sin(star.phase * 0.3), 0));
  } else if (star.style === 2) {
    // Frequent sharp twinkler — secondary fast flicker
    finalOpacity = opacity * (0.85 + 0.15 * Math.sin(star.phase * 3.7));
  }

  // Position shimmer — atmospheric scintillation (1–2 px drift only)
  let drawX = star.baseX;
  let drawY = star.baseY;
  if (star.shimmerRadius > 0) {
    drawX += Math.sin(star.shimmerPhase) * star.shimmerRadius;
    drawY += Math.cos(star.shimmerPhase * 0.7) * star.shimmerRadius * 0.5;
  }

  // Glow halo at near-peak brightness
  if (finalOpacity > 0.4) {
    const glowSize = star.radius * (1 + 2 * (finalOpacity - 0.4));
    const glowGrad = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, glowSize * 2);
    glowGrad.addColorStop(0, `rgba(255, 245, 220, ${finalOpacity * 0.6})`);
    glowGrad.addColorStop(1, `rgba(255, 245, 220, 0)`);
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(drawX, drawY, glowSize * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Star core
  ctx.beginPath();
  ctx.arc(drawX, drawY, star.radius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(240, 235, 215, ${finalOpacity})`;
  ctx.fill();
}
