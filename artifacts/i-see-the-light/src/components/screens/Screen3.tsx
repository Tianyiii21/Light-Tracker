import React, { useEffect, useState, useRef } from "react";
import { useGeneratePoetry } from "@workspace/api-client-react";
import { Mood, getMoodColor, saveEntry } from "../../lib/store";
import { drawLantern } from "../../lib/lantern";

interface Screen3Props {
  onNext: () => void;
  selectedMood: Mood;
}

export default function Screen3({ onNext, selectedMood }: Screen3Props) {
  const { mutate: generatePoetry, isPending } = useGeneratePoetry();
  const [header, setHeader] = useState("Small lights still found me today.");
  const [closingLine, setClosingLine] = useState("Tonight will keep this light safe.");

  const [gratitudes, setGratitudes] = useState(["", "", ""]);
  const [releasing, setReleasing] = useState(false);
  const [showClosing, setShowClosing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number>(0);
  const closingLineRef = useRef(closingLine);

  useEffect(() => {
    closingLineRef.current = closingLine;
  }, [closingLine]);

  useEffect(() => {
    generatePoetry(
      { data: { type: "gratitude_header" } },
      { onSuccess: (data) => { if (data?.text) setHeader(data.text); } }
    );
  }, []);

  const handleRelease = () => {
    setReleasing(true);

    const filledGratitudes = gratitudes.filter((g) => g.trim() !== "");
    saveEntry({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mood: selectedMood,
      gratitudes: filledGratitudes,
      lanternColor: getMoodColor(selectedMood),
    });

    // Fetch closing line in the background
    generatePoetry(
      { data: { type: "closing_line" } },
      { onSuccess: (data) => { if (data?.text) { setClosingLine(data.text); closingLineRef.current = data.text; } } }
    );

    startLanternAnimation();
  };

  const startLanternAnimation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const color = getMoodColor(selectedMood);

    // Phase tracking
    let phase: "gathering" | "rising" | "settled" = "gathering";
    let phaseTime = 0;
    let lastTime = performance.now();

    // Ember particles that gather upward
    let embers = Array.from({ length: 40 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * 160,
      y: h * 0.6 + Math.random() * h * 0.3,
      targetX: w / 2 + (Math.random() - 0.5) * 30,
      targetY: h * 0.45,
      size: Math.random() * 2.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.6,
      speedY: -(Math.random() * 0.8 + 0.3),
      opacity: Math.random() * 0.6 + 0.2,
    }));

    // Single lantern state
    const lantern = {
      x: w / 2,
      y: h * 0.52,
      opacity: 0,
      glow: 0,
      width: 26,
      height: 40,
      sway: 0,
      swaySpeed: 0.008,
      swayAmp: 12,
    };

    // Companion particles alongside rising lantern
    let companions = Array.from({ length: 12 }, (_, i) => ({
      angle: (i / 12) * Math.PI * 2,
      radius: 30 + Math.random() * 20,
      speed: 0.003 + Math.random() * 0.003,
      size: Math.random() * 1.5 + 0.4,
      opacity: Math.random() * 0.5 + 0.2,
    }));

    const render = (now: number) => {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;
      phaseTime += dt;

      animIdRef.current = requestAnimationFrame(render);
      ctx.clearRect(0, 0, w, h);

      if (phase === "gathering") {
        // Embers drift upward and inward
        embers.forEach((e) => {
          e.x += (e.targetX - e.x) * 0.01 + e.speedX * 0.3;
          e.y += (e.targetY - e.y) * 0.01 + e.speedY * 0.3;
          e.speedX *= 0.99;
          e.speedY *= 0.99;

          ctx.beginPath();
          ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(215, 165, 75, ${e.opacity * 0.7})`;
          ctx.fill();
        });

        // Lantern fades in
        if (phaseTime > 1200) {
          lantern.opacity = Math.min(1, (phaseTime - 1200) / 1000);
          lantern.glow = lantern.opacity;

          drawLantern(ctx, {
            x: lantern.x,
            y: lantern.y,
            width: lantern.width * (0.8 + lantern.opacity * 0.2),
            height: lantern.height * (0.8 + lantern.opacity * 0.2),
            color,
            opacity: lantern.opacity,
            glowRadius: lantern.width * 4,
          });
        }

        if (phaseTime > 2800) {
          phase = "rising";
          phaseTime = 0;
        }
      } else if (phase === "rising") {
        const progress = Math.min(phaseTime / 4000, 1);
        // Ease out
        const eased = 1 - Math.pow(1 - progress, 3);

        lantern.y = h * 0.52 - eased * h * 0.38;
        lantern.sway += lantern.swaySpeed;
        const swayX = Math.sin(lantern.sway) * lantern.swayAmp * (1 - eased * 0.5);
        lantern.x = w / 2 + swayX;

        // Companion particles
        companions.forEach((c) => {
          c.angle += c.speed;
          const px = lantern.x + Math.cos(c.angle) * c.radius;
          const py = lantern.y + Math.sin(c.angle) * (c.radius * 0.3);
          ctx.beginPath();
          ctx.arc(px, py, c.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(215, 165, 75, ${c.opacity * 0.6})`;
          ctx.fill();
        });

        drawLantern(ctx, {
          x: lantern.x,
          y: lantern.y,
          width: lantern.width,
          height: lantern.height,
          color,
          opacity: 0.95,
          glowRadius: lantern.width * 5,
        });

        // Shimmer reflections on ocean
        for (let i = 0; i < 5; i++) {
          const rx = w / 2 + (Math.random() - 0.5) * 200;
          const ry = h * 0.78 + Math.random() * h * 0.1;
          ctx.beginPath();
          ctx.ellipse(rx, ry, 15 + Math.random() * 20, 2, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(215, 165, 75, ${0.03 + Math.random() * 0.04})`;
          ctx.fill();
        }

        if (phaseTime > 4200) {
          phase = "settled";
          phaseTime = 0;
        }
      } else if (phase === "settled") {
        // Lantern drifts gently at top
        lantern.sway += lantern.swaySpeed * 0.5;
        lantern.x = w / 2 + Math.sin(lantern.sway * 0.7) * 8;
        lantern.y = h * 0.14 + Math.sin(lantern.sway * 0.4) * 4;

        companions.forEach((c) => {
          c.angle += c.speed * 0.3;
          const px = lantern.x + Math.cos(c.angle) * c.radius * 0.7;
          const py = lantern.y + Math.sin(c.angle) * (c.radius * 0.2);
          ctx.beginPath();
          ctx.arc(px, py, c.size * 0.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(215, 165, 75, ${c.opacity * 0.4})`;
          ctx.fill();
        });

        drawLantern(ctx, {
          x: lantern.x,
          y: lantern.y,
          width: lantern.width,
          height: lantern.height,
          color,
          opacity: 0.9,
          glowRadius: lantern.width * 5,
        });

        // Show closing content after 1.5s settled
        if (phaseTime > 1500 && !showClosing) {
          setShowClosing(true);
          cancelAnimationFrame(animIdRef.current);
        }
      }
    };

    animIdRef.current = requestAnimationFrame(render);

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  };

  const hasInput = gratitudes.some((g) => g.trim() !== "");

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col items-center">
      {/* Canvas behind everything */}
      <canvas ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none" />

      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1220] via-[#0c1a26] to-[#080c14]" />
        {/* Stars */}
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 55}%`,
              width: `${Math.random() * 1.5 + 0.5}px`,
              height: `${Math.random() * 1.5 + 0.5}px`,
              background: "rgba(255,255,255,0.6)",
              animation: `pulse ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 4}s`,
            }}
          />
        ))}
        {/* Ocean horizon shimmer */}
        <div className="absolute w-full" style={{ top: "70%", height: "1px", background: "rgba(215,165,75,0.08)" }} />
      </div>

      {/* Writing UI */}
      <div
        className={`relative z-20 w-full max-w-md flex flex-col items-center gap-5 pt-16 px-6 pb-28 overflow-y-auto h-full transition-opacity duration-1000 ${
          releasing ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <h2
          className="font-serif italic text-xl text-[#D7A54B] text-center mb-4 fade-up delay-100"
          style={{ textShadow: "0 0 20px rgba(215,165,75,0.25)" }}
        >
          {isPending && header === "Small lights still found me today." ? "..." : header}
        </h2>

        {gratitudes.map((g, i) => (
          <div
            key={i}
            className="w-full rounded-xl fade-up"
            style={{
              background: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(215,165,75,0.15)",
              animationDelay: `${(i + 2) * 120}ms`,
            }}
          >
            <textarea
              value={g}
              onChange={(e) => {
                const newG = [...gratitudes];
                newG[i] = e.target.value;
                setGratitudes(newG);
              }}
              data-testid={`input-gratitude-${i}`}
              className="w-full bg-transparent border-none outline-none resize-none p-5 font-sans font-light text-base leading-relaxed min-h-[90px]"
              style={{
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

        <button
          onClick={handleRelease}
          disabled={!hasInput}
          data-testid="button-release"
          className={`mt-6 px-8 py-3 rounded-full font-serif italic text-lg transition-all duration-500 fade-up delay-500 ${
            hasInput
              ? "text-[#D7A54B] cursor-pointer"
              : "text-[#D7A54B]/25 cursor-not-allowed"
          }`}
          style={{
            background: hasInput ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
            backdropFilter: "blur(12px)",
            border: `1px solid rgba(215,165,75,${hasInput ? "0.25" : "0.08"})`,
            boxShadow: hasInput ? "0 0 30px rgba(215,165,75,0.08)" : "none",
          }}
        >
          Release to the Sky
        </button>
      </div>

      {/* Closing content */}
      {showClosing && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-end pb-24 px-6 text-center">
          <p
            className="font-serif italic text-2xl text-[#D7A54B] mb-12 fade-up"
            style={{ textShadow: "0 0 20px rgba(215,165,75,0.45)" }}
          >
            {closingLine}
          </p>
          <button
            onClick={onNext}
            data-testid="button-enter-memory-sky"
            className="px-8 py-3 rounded-full font-serif italic text-lg text-[#D7A54B] fade-up delay-300"
            style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(215,165,75,0.25)",
            }}
          >
            Enter Your Memory Sky →
          </button>
        </div>
      )}
    </div>
  );
}
