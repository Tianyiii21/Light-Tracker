import React, { useEffect, useState, useRef, useCallback } from "react";
import { JournalEntry, loadEntries } from "../../lib/store";
import { drawLantern } from "../../lib/lantern";
import { format } from "date-fns";

interface Screen4Props {
  onBack: () => void;
}

interface LanternData extends JournalEntry {
  x: number;
  y: number;
  width: number;
  height: number;
  wobblePhase: number;
  wobbleSpeed: number;
  driftAmpX: number;
  driftAmpY: number;
  opacity: number;
}

// Module-level stable star data for Memory Sky — never recalculated
const SKY_STARS = Array.from({ length: 130 }, () => ({
  xFrac: Math.random(),
  yFrac: Math.random() * 0.84,
  size: Math.random() * 1.2 + 0.15,
  phase: Math.random() * Math.PI * 2,
  freq: 0.008 + Math.random() * 0.007,
  base: 0.12 + Math.random() * 0.2,
  amp: 0.07 + Math.random() * 0.14,
}));

export default function Screen4({ onBack }: Screen4Props) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lanternDataRef = useRef<LanternData[]>([]);
  const animIdRef = useRef<number>(0);

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  // Build lantern positions once when entries arrive
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const n = entries.length;
    const horizonY = h * 0.8;

    lanternDataRef.current = entries.map((entry, i) => {
      const recency = n <= 1 ? 1 : i / (n - 1); // 0 = oldest, 1 = newest
      const width = 12 + recency * 9;            // 12–21 px
      const height = width * 1.55;
      const opacity = 0.38 + recency * 0.54;     // 0.38–0.92

      // Scatter naturally across the sky, avoiding the horizon band
      const margin = 55;
      const skyBottom = horizonY - 30;
      return {
        ...entry,
        x: margin + Math.random() * (w - margin * 2),
        y: margin + Math.random() * (skyBottom - margin * 2),
        width,
        height,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.003 + Math.random() * 0.004,
        driftAmpX: 3 + Math.random() * 5,
        driftAmpY: 2 + Math.random() * 4,
        opacity,
      };
    });
  }, [entries]);

  // Canvas click → find nearest lantern
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (selectedEntry) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      let closest: LanternData | null = null;
      let closestDist = Infinity;

      for (const l of lanternDataRef.current) {
        const dist = Math.sqrt((cx - l.x) ** 2 + (cy - l.y) ** 2);
        if (dist < l.width * 2.8 && dist < closestDist) {
          closestDist = dist;
          closest = l;
        }
      }
      if (closest) setSelectedEntry(closest);
    },
    [selectedEntry]
  );

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    let frame = 0;

    const render = () => {
      animIdRef.current = requestAnimationFrame(render);
      frame++;

      ctx.clearRect(0, 0, w, h);

      // Night sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, "#04060c");
      skyGrad.addColorStop(0.55, "#080d18");
      skyGrad.addColorStop(0.82, "#0b1220");
      skyGrad.addColorStop(1, "#09101c");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Ocean horizon
      const horizonY = h * 0.82;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(w, horizonY);
      ctx.strokeStyle = "rgba(215,165,75,0.07)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Dark water below horizon
      const waterGrad = ctx.createLinearGradient(0, horizonY, 0, h);
      waterGrad.addColorStop(0, "rgba(9,14,24,0.95)");
      waterGrad.addColorStop(1, "rgba(5,7,12,1)");
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, horizonY, w, h - horizonY);

      // Stars — slow, stable, never flash
      for (const s of SKY_STARS) {
        const alpha = Math.max(0, s.base + s.amp * Math.sin(frame * s.freq + s.phase));
        ctx.beginPath();
        ctx.arc(s.xFrac * w, s.yFrac * h, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,220,255,${alpha})`;
        ctx.fill();
      }

      // Lanterns drift with individual sine-wave phases
      for (const l of lanternDataRef.current) {
        l.wobblePhase += l.wobbleSpeed;
        const dx = Math.sin(l.wobblePhase * 0.9) * l.driftAmpX;
        const dy = Math.cos(l.wobblePhase * 0.6) * l.driftAmpY;

        drawLantern(ctx, {
          x: l.x + dx,
          y: l.y + dy,
          width: l.width,
          height: l.height,
          color: l.lanternColor,
          opacity: l.opacity,
          glowRadius: l.width * 4.5,
        });

        // Faint water reflection
        if (l.y < horizonY) {
          const reflectY = horizonY + (horizonY - (l.y + dy)) * 0.12;
          ctx.save();
          ctx.globalAlpha = l.opacity * 0.1;
          drawLantern(ctx, {
            x: l.x + dx,
            y: reflectY,
            width: l.width * 0.55,
            height: l.height * 0.3,
            color: l.lanternColor,
            opacity: 1,
            glowRadius: l.width * 2.5,
          });
          ctx.restore();
        }
      }
    };

    render();

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [entries]);

  const moodEmoji: Record<string, string> = {
    clear: "☀️", soft: "🌤", heavy: "🌧", quiet: "🌙",
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Full-canvas night sky */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        onClick={handleCanvasClick}
        style={{ cursor: entries.length > 0 ? "pointer" : "default" }}
      />

      {/* Title */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex justify-center pointer-events-none"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}
      >
        <h1
          className="font-serif memory-sky-title fade-up"
          style={{ fontSize: "clamp(2rem, 5.5vw, 2.25rem)" }}
        >
          Your Memory Sky
        </h1>
      </div>

      {/* Day 1 empty state */}
      {entries.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-10 pointer-events-none">
          <p
            className="font-serif italic text-2xl leading-relaxed fade-up delay-200"
            style={{ color: "rgba(215,165,75,0.62)" }}
          >
            Your sky is waiting.
          </p>
          <p
            className="font-serif italic text-xl mt-3 leading-relaxed fade-up delay-400"
            style={{ color: "rgba(215,165,75,0.38)" }}
          >
            Release your first light tonight.
          </p>
        </div>
      )}

      {/* Return to Tonight button */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 flex justify-center"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}
      >
        <button
          onClick={onBack}
          data-testid="button-return-to-tonight"
          className="px-6 py-2 rounded-full font-sans font-light text-sm text-[#D7A54B]/50 hover:text-[#D7A54B]/75 transition-colors duration-500 fade-up delay-300"
          style={{
            background: "rgba(8,12,22,0.65)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(215,165,75,0.1)",
          }}
        >
          Return to Tonight
        </button>
      </div>

      {/* Entry detail overlay */}
      {selectedEntry && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(4,6,12,0.88)", backdropFilter: "blur(20px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedEntry(null); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-8 relative flex flex-col items-center text-center fade-up"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(215,165,75,0.18)",
            }}
          >
            <button
              onClick={() => setSelectedEntry(null)}
              data-testid="button-close-entry"
              className="absolute top-4 right-5 font-sans text-2xl text-[#D7A54B]/35 hover:text-[#D7A54B]/70 transition-colors leading-none"
            >
              ×
            </button>

            {/* Mini lantern icon */}
            <canvas
              width={50}
              height={72}
              className="mb-5"
              ref={(el) => {
                if (!el) return;
                const ctx2 = el.getContext("2d");
                if (!ctx2) return;
                ctx2.clearRect(0, 0, 50, 72);
                drawLantern(ctx2, {
                  x: 25, y: 34,
                  width: 20, height: 31,
                  color: selectedEntry.lanternColor,
                  opacity: 0.95,
                  glowRadius: 26,
                });
              }}
            />

            <p className="font-sans text-xs uppercase tracking-widest text-[#D7A54B]/50 mb-1">
              {format(new Date(selectedEntry.date), "MMMM d, yyyy")}
            </p>
            <p className="font-sans text-xs text-[#D7A54B]/30 mb-8">
              {moodEmoji[selectedEntry.mood]} {selectedEntry.mood}
            </p>

            <div className="flex flex-col gap-5 w-full">
              {selectedEntry.gratitudes.map((g, i) => (
                <p
                  key={i}
                  className="font-serif italic text-lg leading-relaxed"
                  style={{ color: "rgba(240,220,185,0.86)" }}
                >
                  {g}
                </p>
              ))}
            </div>

            <button
              onClick={() => setSelectedEntry(null)}
              className="mt-10 font-sans text-xs tracking-widest uppercase"
              style={{ color: "rgba(215,165,75,0.3)", background: "none", border: "none", cursor: "pointer" }}
            >
              return to sky
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
