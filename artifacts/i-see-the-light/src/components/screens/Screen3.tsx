import React, { useEffect, useState, useRef, useCallback } from "react";
import { useGeneratePoetry } from "@workspace/api-client-react";
import { Mood, getMoodColor, saveEntry, updateEntryClosingLine } from "../../lib/store";
import { drawLantern } from "../../lib/lantern";
import { audioEngine } from "../../lib/audio";
import { createStars, resizeStars, drawStar } from "../../lib/stars";

type Phase = "writing" | "releasing" | "settled" | "linkVisible";

export interface Screen3Props {
  onNext: () => void;
  selectedMood: Mood;
  initialState?: "writing" | "settled";
  savedClosingLine?: string;
  onClosingLineSaved?: (line: string) => void;
}

// Module-level star data — created ONCE at import time, mutated only by the animation loop.
// Stars NEVER react to user input — phase/shimmer driven solely by the canvas loop.
const STARS = createStars(60, 0.60);

type ReleaseState = {
  subPhase: "gathering" | "rising" | "settling";
  startMs: number;
  lanternX: number;
  lanternY: number;
  wobble: number;
  fired: boolean;
  embers: Array<{
    x: number; y: number; tx: number; ty: number;
    size: number; vx: number; vy: number; opacity: number;
  }>;
  companions: Array<{
    angle: number; radius: number; speed: number; size: number; opacity: number;
  }>;
};

export default function Screen3({
  onNext,
  selectedMood,
  initialState = "writing",
  savedClosingLine = "Tonight will keep this light safe.",
  onClosingLineSaved,
}: Screen3Props) {
  const isReturning = initialState === "settled";

  const [phase, setPhase] = useState<Phase>(isReturning ? "linkVisible" : "writing");
  const phaseRef = useRef<Phase>(isReturning ? "linkVisible" : "writing");

  const [gratitudes, setGratitudes] = useState(["", "", ""]);
  const [closingLine, setClosingLine] = useState(savedClosingLine);
  const closingLineRef = useRef(savedClosingLine);

  const [header, setHeader] = useState("Small lights still found me today.");
  const { mutate: generatePoetry, isPending } = useGeneratePoetry();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number>(0);

  // Release animation state (lives in a ref so canvas loop can read it without causing re-renders)
  const releaseRef = useRef<ReleaseState | null>(null);

  // Settled lantern position — updated by release animation, used by settled/linkVisible drawing
  const settledLanternRef = useRef({
    x: 0,
    y: 0,
    wobble: 0,
    opacity: isReturning ? 0.92 : 0,
  });

  // --- Fetch gratitude header on mount (only when writing fresh) ---
  useEffect(() => {
    if (isReturning) return;
    generatePoetry(
      { data: { type: "gratitude_header" } },
      { onSuccess: (data) => { if (data?.text) setHeader(data.text); } }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Auto-advance timers (only for non-returning flow) ---
  useEffect(() => {
    if (isReturning) return;
    if (phase === "settled") {
      const t = setTimeout(() => {
        setPhase("linkVisible");
        phaseRef.current = "linkVisible";
      }, 3000);
      return () => clearTimeout(t);
    }
    if (phase === "linkVisible") {
      const t = setTimeout(onNext, 5000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase, isReturning, onNext]);

  // --- Release handler ---
  const handleRelease = useCallback(() => {
    const filledGratitudes = gratitudes.filter((g) => g.trim() !== "");
    if (!filledGratitudes.length) return;

    const entryId = crypto.randomUUID();
    saveEntry({
      id: entryId,
      date: new Date().toISOString(),
      mood: selectedMood,
      gratitudes: filledGratitudes,
      lanternColor: getMoodColor(selectedMood),
      closingLine: "",
    });

    // Trigger audio swell during release animation
    audioEngine.triggerReleaseSwell();

    // Fetch closing line in parallel — update ref so canvas callback can read it,
    // then persist it back to the saved entry so return visits can show it.
    generatePoetry(
      { data: { type: "closing_line" } },
      {
        onSuccess: (data) => {
          if (data?.text) {
            setClosingLine(data.text);
            closingLineRef.current = data.text;
            onClosingLineSaved?.(data.text);
            updateEntryClosingLine(entryId, data.text);
          }
        },
      }
    );

    // Initialize release animation from canvas dimensions
    const canvas = canvasRef.current;
    const w = canvas ? canvas.width : window.innerWidth;
    const h = canvas ? canvas.height : window.innerHeight;

    releaseRef.current = {
      subPhase: "gathering",
      startMs: performance.now(),
      lanternX: w / 2,
      lanternY: h * 0.5,
      wobble: 0,
      fired: false,
      embers: Array.from({ length: 44 }, () => ({
        x: w / 2 + (Math.random() - 0.5) * 200,
        y: h * 0.5 + Math.random() * h * 0.35,
        tx: w / 2 + (Math.random() - 0.5) * 22,
        ty: h * 0.47,
        size: Math.random() * 2.4 + 0.4,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(Math.random() * 0.7 + 0.3),
        opacity: Math.random() * 0.55 + 0.2,
      })),
      companions: Array.from({ length: 10 }, (_, i) => ({
        angle: (i / 10) * Math.PI * 2,
        radius: 28 + Math.random() * 18,
        speed: 0.003 + Math.random() * 0.003,
        size: Math.random() * 1.3 + 0.3,
        opacity: Math.random() * 0.4 + 0.15,
      })),
    };

    // Initialise settled lantern start position
    settledLanternRef.current = { x: w / 2, y: h * 0.14, wobble: 0, opacity: 0 };

    setPhase("releasing");
    phaseRef.current = "releasing";
  }, [gratitudes, selectedMood, onClosingLineSaved, generatePoetry]);

  // --- Single persistent canvas animation loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    ctx.scale(dpr, dpr);
    let w = window.innerWidth;
    let h = window.innerHeight;
    let frame = 0;

    const moodColor = getMoodColor(selectedMood);

    // If returning, set settled lantern to final position immediately
    if (isReturning) {
      settledLanternRef.current = { x: w / 2, y: h * 0.14, wobble: 0, opacity: 0.92 };
    }

    const render = () => {
      animIdRef.current = requestAnimationFrame(render);
      frame++;

      ctx.clearRect(0, 0, w, h);

      // --- Sky background ---
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0d1220");
      bg.addColorStop(0.5, "#0c1a26");
      bg.addColorStop(0.72, "#0a1520");
      bg.addColorStop(1, "#0d1220");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Ocean horizon line
      ctx.beginPath();
      ctx.moveTo(0, h * 0.72);
      ctx.lineTo(w, h * 0.72);
      ctx.strokeStyle = "rgba(215,165,75,0.07)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Water shimmer
      const shimmerAlpha = 0.018 + 0.008 * Math.sin(frame * 0.025);
      for (let i = 0; i < 5; i++) {
        const rx = w * (0.1 + i * 0.19 + 0.04 * Math.sin(frame * 0.018 + i * 1.3));
        ctx.beginPath();
        ctx.ellipse(rx, h * 0.76, 18 + i * 7, 1.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(215,165,75,${shimmerAlpha})`;
        ctx.fill();
      }

      // --- Stars — three-style twinkling, glow halos at peak, position shimmer ---
      for (const s of STARS) {
        drawStar(ctx, s);
      }

      // --- Release animation ---
      const rel = releaseRef.current;
      const curPhase = phaseRef.current;

      if (curPhase === "releasing" && rel) {
        const elapsed = performance.now() - rel.startMs;

        if (rel.subPhase === "gathering") {
          // Embers drift upward and inward
          for (const e of rel.embers) {
            e.x += (e.tx - e.x) * 0.011 + e.vx * 0.18;
            e.y += (e.ty - e.y) * 0.011 + e.vy * 0.18;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(215,165,75,${e.opacity * 0.65})`;
            ctx.fill();
          }

          // Lantern emerges from gathering embers
          if (elapsed > 1300) {
            const lOpacity = Math.min(1, (elapsed - 1300) / 1000);
            const scale = 0.7 + lOpacity * 0.3;
            drawLantern(ctx, {
              x: w / 2,
              y: h * 0.48,
              width: 26 * scale,
              height: 40 * scale,
              color: moodColor,
              opacity: lOpacity,
              glowRadius: 26 * 4,
            });
          }

          if (elapsed > 2700) {
            rel.subPhase = "rising";
            rel.startMs = performance.now();
          }
        } else if (rel.subPhase === "rising") {
          const elapsed2 = performance.now() - rel.startMs;
          const progress = Math.min(elapsed2 / 4200, 1);
          const eased = 1 - Math.pow(1 - progress, 3);

          rel.wobble += 0.008;
          rel.lanternX = w / 2 + Math.sin(rel.wobble) * 13;
          rel.lanternY = h * 0.48 - eased * h * 0.36;

          // Companion particles orbit lantern
          for (const c of rel.companions) {
            c.angle += c.speed;
            const px = rel.lanternX + Math.cos(c.angle) * c.radius;
            const py = rel.lanternY + Math.sin(c.angle) * (c.radius * 0.28);
            ctx.beginPath();
            ctx.arc(px, py, c.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(215,165,75,${c.opacity * 0.5})`;
            ctx.fill();
          }

          drawLantern(ctx, {
            x: rel.lanternX,
            y: rel.lanternY,
            width: 26,
            height: 40,
            color: moodColor,
            opacity: 0.95,
            glowRadius: 26 * 5,
          });

          // Ocean reflections
          if (frame % 3 === 0) {
            for (let i = 0; i < 3; i++) {
              ctx.beginPath();
              ctx.ellipse(
                w / 2 + (Math.random() - 0.5) * 200,
                h * 0.77 + Math.random() * h * 0.07,
                16 + Math.random() * 24, 1.8, 0, 0, Math.PI * 2
              );
              ctx.fillStyle = "rgba(215,165,75,0.025)";
              ctx.fill();
            }
          }

          if (progress >= 1 && !rel.fired) {
            rel.fired = true;
            rel.subPhase = "settling";
            // Hand off settled lantern at current position
            settledLanternRef.current = {
              x: rel.lanternX,
              y: rel.lanternY,
              wobble: rel.wobble,
              opacity: 0.92,
            };
            // Transition phase in React
            setPhase("settled");
            phaseRef.current = "settled";
          }
        } else if (rel.subPhase === "settling") {
          // Keep drawing the lantern at its resting point while phase catches up
          drawLantern(ctx, {
            x: settledLanternRef.current.x,
            y: settledLanternRef.current.y,
            width: 24,
            height: 38,
            color: moodColor,
            opacity: 0.92,
            glowRadius: 24 * 5,
          });
        }
      }

      // --- Settled/linkVisible: drifting lantern ---
      if (curPhase === "settled" || curPhase === "linkVisible" || isReturning) {
        const sl = settledLanternRef.current;
        sl.wobble += 0.0055;
        const targetX = w / 2 + Math.sin(sl.wobble * 0.9) * 10;
        const targetY = h * 0.14 + Math.sin(sl.wobble * 0.55) * 5;
        sl.x += (targetX - sl.x) * 0.018;
        sl.y += (targetY - sl.y) * 0.018;
        if (sl.opacity < 0.92) sl.opacity = Math.min(0.92, sl.opacity + 0.006);

        drawLantern(ctx, {
          x: sl.x,
          y: sl.y,
          width: 24,
          height: 38,
          color: moodColor,
          opacity: sl.opacity,
          glowRadius: 24 * 5.5,
        });
      }
    };

    render();

    const handleResize = () => {
      const r = window.devicePixelRatio || 1;
      canvas.width = Math.round(window.innerWidth * r);
      canvas.height = Math.round(window.innerHeight * r);
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
      ctx.scale(r, r);
      w = window.innerWidth;
      h = window.innerHeight;
      resizeStars(STARS, w, h);
      ctx.fillStyle = "#0d1220";
      ctx.fillRect(0, 0, w, h);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, []); // single persistent loop — never restarts

  const hasInput = gratitudes.some((g) => g.trim() !== "");

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Full-screen canvas — pointer-events-none so UI receives clicks */}
      <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />

      {/* PRE-RELEASE writing UI — distributed evenly across full screen height */}
      {(phase === "writing" || phase === "releasing") && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center transition-opacity duration-[1500ms]"
          style={{
            opacity: phase === "releasing" ? 0 : 1,
            pointerEvents: phase === "releasing" ? "none" : "auto",
            justifyContent: "space-evenly",
            paddingTop: "calc(env(safe-area-inset-top) + 20px)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 28px)",
            paddingLeft: "24px",
            paddingRight: "24px",
            boxSizing: "border-box",
          }}
        >
          {/* AI poetic header */}
          <h2
            className="font-serif italic text-xl text-[#D7A54B] text-center fade-up delay-100"
            style={{ textShadow: "0 0 20px rgba(215,165,75,0.22)", maxWidth: "360px" }}
          >
            {header}
          </h2>

          {/* Writing cards */}
          <div className="w-full max-w-md flex flex-col gap-4">
            {gratitudes.map((g, i) => (
              <div
                key={i}
                className="w-full rounded-xl fade-up"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(215,165,75,0.14)",
                  animationDelay: `${(i + 1) * 130}ms`,
                }}
              >
                <textarea
                  value={g}
                  onChange={(e) => {
                    const next = [...gratitudes];
                    next[i] = e.target.value;
                    setGratitudes(next);
                  }}
                  data-testid={`input-gratitude-${i}`}
                  className="w-full bg-transparent border-none outline-none resize-none p-5"
                  style={{
                    minHeight: "80px",
                    color: "rgba(240,220,185,0.88)",
                    caretColor: "#D7A54B",
                    fontSize: "16px",
                    lineHeight: "1.65",
                    fontFamily: "'Nunito', sans-serif",
                    fontWeight: 300,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Release button — sits in lower portion naturally via space-evenly */}
          <button
            onClick={handleRelease}
            disabled={!hasInput}
            data-testid="button-release"
            className="px-8 py-3 rounded-full font-serif italic text-lg transition-all duration-500 fade-up"
            style={{
              animationDelay: "500ms",
              color: hasInput ? "#D7A54B" : "rgba(215,165,75,0.22)",
              background: hasInput ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
              backdropFilter: "blur(12px)",
              border: `1px solid rgba(215,165,75,${hasInput ? "0.24" : "0.07"})`,
              cursor: hasInput ? "pointer" : "not-allowed",
            }}
          >
            Release to the Sky
          </button>
        </div>
      )}

      {/* POST-RELEASE view — closing line + memory sky link */}
      {(phase === "settled" || phase === "linkVisible") && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8 text-center">
          {/* Closing line — emotionally prominent */}
          <p
            className="font-serif italic leading-relaxed fade-up"
            style={{
              fontSize: "clamp(1.45rem, 5.5vw, 2.1rem)",
              color: "#D7A54B",
              textShadow: "0 0 30px rgba(215,165,75,0.4), 0 0 60px rgba(215,165,75,0.15)",
              maxWidth: "320px",
              lineHeight: "1.72",
            }}
          >
            {closingLine}
          </p>

          {/* "your memory sky →" — plain text link, NOT a button/pill */}
          {phase === "linkVisible" && (
            <button
              onClick={onNext}
              data-testid="button-memory-sky-link"
              className="mt-14 fade-up"
              style={{
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 300,
                fontSize: "0.82rem",
                letterSpacing: "0.03em",
                color: "rgba(215,165,75,0.38)",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "color 0.4s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(215,165,75,0.65)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(215,165,75,0.38)")}
            >
              your memory sky →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
