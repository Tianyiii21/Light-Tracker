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
  driftX: number;
  opacity: number;
}

export default function Screen4({ onBack }: Screen4Props) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lanternDataRef = useRef<LanternData[]>([]);
  const animIdRef = useRef<number>(0);

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  // Build lantern positions whenever entries change
  useEffect(() => {
    if (!canvasRef.current) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const n = entries.length;

    lanternDataRef.current = entries.map((entry, i) => {
      // Recency: i=0 oldest, i=n-1 newest
      const recency = n <= 1 ? 1 : i / (n - 1);
      const width = 13 + recency * 8; // 13–21px
      const height = width * 1.55;
      const opacity = 0.38 + recency * 0.55; // 0.38–0.93

      // Scatter in sky area avoiding edges
      const margin = 60;
      const skyH = h * 0.78;
      return {
        ...entry,
        x: margin + Math.random() * (w - margin * 2),
        y: margin + Math.random() * (skyH - margin * 2),
        width,
        height,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.003 + Math.random() * 0.004,
        driftX: (Math.random() - 0.5) * 0.15,
        opacity,
      };
    });
  }, [entries]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (selectedEntry) return; // modal open — ignore
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      for (const l of lanternDataRef.current) {
        const dist = Math.sqrt((cx - l.x) ** 2 + (cy - l.y) ** 2);
        if (dist < l.width * 2.5) {
          setSelectedEntry(l);
          return;
        }
      }
    },
    [selectedEntry]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    let time = 0;

    // Generate static stars
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.82,
      size: Math.random() * 1.2 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 1.2,
      brightness: 0.3 + Math.random() * 0.6,
    }));

    const render = () => {
      animIdRef.current = requestAnimationFrame(render);
      time += 0.01;

      ctx.clearRect(0, 0, w, h);

      // Night sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, "#050810");
      skyGrad.addColorStop(0.6, "#0a0f1c");
      skyGrad.addColorStop(0.85, "#0d1525");
      skyGrad.addColorStop(1, "#0a1020");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Ocean horizon
      const horizonY = h * 0.82;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(w, horizonY);
      ctx.strokeStyle = "rgba(215,165,75,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Water reflection shimmer
      const waterGrad = ctx.createLinearGradient(0, horizonY, 0, h);
      waterGrad.addColorStop(0, "rgba(10,16,32,0.9)");
      waterGrad.addColorStop(1, "rgba(6,9,18,1)");
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, horizonY, w, h - horizonY);

      // Stars
      stars.forEach((s) => {
        const alpha = s.brightness * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,220,255,${alpha})`;
        ctx.fill();
      });

      // Drift lanterns
      const lanterns = lanternDataRef.current;
      lanterns.forEach((l) => {
        l.wobblePhase += l.wobbleSpeed;
        const driftY = Math.sin(l.wobblePhase) * 3.5;
        const driftX = Math.cos(l.wobblePhase * 0.7) * 2 + l.driftX;
        l.x += driftX * 0.05;
        if (l.x < 30) l.x = 30;
        if (l.x > w - 30) l.x = w - 30;

        drawLantern(ctx, {
          x: l.x,
          y: l.y + driftY,
          width: l.width,
          height: l.height,
          color: l.lanternColor,
          opacity: l.opacity,
          glowRadius: l.width * 4.5,
        });

        // Water reflection of each lantern
        if (l.y < horizonY) {
          ctx.save();
          ctx.globalAlpha = l.opacity * 0.12;
          ctx.scale(1, -0.25);
          drawLantern(ctx, {
            x: l.x,
            y: -(horizonY * 4 + (l.y - horizonY) * 0.25),
            width: l.width * 0.7,
            height: l.height * 0.7,
            color: l.lanternColor,
            opacity: 1,
          });
          ctx.restore();
        }
      });
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
    clear: "☀️",
    soft: "🌤",
    heavy: "🌧",
    quiet: "🌙",
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Full-canvas sky */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        onClick={handleCanvasClick}
        style={{ cursor: entries.length > 0 ? "pointer" : "default" }}
      />

      {/* Title */}
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-center pt-14 pointer-events-none" style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}>
        <h1
          className="font-serif text-3xl text-[#D7A54B] fade-up"
          style={{ textShadow: "0 0 20px rgba(215,165,75,0.5), 0 0 40px rgba(215,165,75,0.2)" }}
        >
          Your Memory Sky
        </h1>
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-10 pointer-events-none">
          <p
            className="font-serif italic text-2xl text-[#D7A54B]/70 leading-relaxed fade-up delay-200"
          >
            Your sky is waiting.
          </p>
          <p className="font-serif italic text-xl text-[#D7A54B]/45 mt-3 leading-relaxed fade-up delay-400">
            Release your first light tonight.
          </p>
        </div>
      )}

      {/* Back button */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center pb-10" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}>
        <button
          onClick={onBack}
          data-testid="button-back-to-shore"
          className="px-6 py-2 rounded-full font-sans font-light text-sm text-[#D7A54B]/55 hover:text-[#D7A54B]/80 transition-colors fade-up delay-300"
          style={{
            background: "rgba(13,18,32,0.6)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(215,165,75,0.12)",
          }}
        >
          Back to the Shore
        </button>
      </div>

      {/* Entry detail overlay */}
      {selectedEntry && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(5,8,16,0.85)", backdropFilter: "blur(16px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedEntry(null); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-8 relative flex flex-col items-center text-center fade-up"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(215,165,75,0.2)",
              boxShadow: "0 0 60px rgba(0,0,0,0.5)",
            }}
          >
            <button
              onClick={() => setSelectedEntry(null)}
              data-testid="button-close-entry"
              className="absolute top-4 right-4 font-sans text-xl text-[#D7A54B]/40 hover:text-[#D7A54B]/80 transition-colors w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>

            {/* Lantern icon */}
            <canvas
              width={50}
              height={70}
              className="mb-6"
              ref={(el) => {
                if (!el) return;
                const ctx2 = el.getContext("2d");
                if (!ctx2) return;
                ctx2.clearRect(0, 0, 50, 70);
                drawLantern(ctx2, {
                  x: 25,
                  y: 32,
                  width: 20,
                  height: 32,
                  color: selectedEntry.lanternColor,
                  opacity: 0.95,
                  glowRadius: 28,
                });
              }}
            />

            <p className="font-sans text-xs uppercase tracking-widest text-[#D7A54B]/55 mb-1">
              {format(new Date(selectedEntry.date), "MMMM d, yyyy")}
            </p>
            <p className="font-sans text-xs text-[#D7A54B]/35 mb-8">
              {moodEmoji[selectedEntry.mood]} {selectedEntry.mood} light
            </p>

            <div className="flex flex-col gap-5 w-full">
              {selectedEntry.gratitudes.map((g, i) => (
                <p
                  key={i}
                  className="font-serif italic text-lg leading-relaxed"
                  style={{ color: "rgba(240,220,185,0.88)" }}
                >
                  {g}
                </p>
              ))}
            </div>

            <button
              onClick={() => setSelectedEntry(null)}
              className="mt-10 font-sans text-xs text-[#D7A54B]/35 hover:text-[#D7A54B]/60 transition-colors tracking-widest uppercase"
            >
              return to sky
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
