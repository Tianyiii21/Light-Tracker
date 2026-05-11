import React, { useEffect, useRef, useState } from "react";

interface Screen1Props {
  onNext: () => void;
}

export default function Screen1({ onNext }: Screen1Props) {
  // React state for display updates only
  const [displayPhase, setDisplayPhase] = useState<"inhale" | "exhale">("inhale");
  const [cycleCount, setCycleCount] = useState(0);
  const [completed, setCompleted] = useState(false);

  // All animation/timing state in refs so the loop never restarts
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const breathStateRef = useRef(0); // 0 = exhaled, 1 = inhaled
  const breathTargetRef = useRef(1); // start inhaling
  const phaseStartRef = useRef(Date.now());
  const cycleCountRef = useRef(0);
  const phaseRef = useRef<"inhale" | "exhale">("inhale");
  const completedRef = useRef(false);
  const animIdRef = useRef<number>(0);

  // Display-state sync interval
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayPhase(phaseRef.current);
      setCycleCount(cycleCountRef.current);
      if (completedRef.current) setCompleted(true);
    }, 100);
    return () => clearInterval(interval);
  }, []);

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

    const PHASE_DURATION = 4500; // ms

    // Particles in the sky
    const particles = Array.from({ length: 22 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.55,
      size: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.12,
      speedY: -Math.random() * 0.08 - 0.02,
      color: Math.random() > 0.5 ? [215, 165, 75] : [170, 150, 215],
      opacity: Math.random() * 0.5 + 0.1,
    }));

    let time = 0;

    const render = () => {
      animIdRef.current = requestAnimationFrame(render);
      time += 0.008;

      const now = Date.now();
      const elapsed = now - phaseStartRef.current;

      if (!completedRef.current) {
        // Switch phase after PHASE_DURATION
        if (elapsed >= PHASE_DURATION) {
          phaseStartRef.current = now;
          if (phaseRef.current === "inhale") {
            phaseRef.current = "exhale";
            breathTargetRef.current = 0;
          } else {
            phaseRef.current = "inhale";
            breathTargetRef.current = 1;
            cycleCountRef.current += 1;
            if (cycleCountRef.current >= 3) {
              completedRef.current = true;
              setTimeout(() => onNext(), 2800);
            }
          }
        }

        // Smooth lerp: current += (target - current) * 0.008
        breathStateRef.current +=
          (breathTargetRef.current - breathStateRef.current) * 0.008;
      }

      const bs = breathStateRef.current;

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Sky gradient — warms as cycles complete
      const warmth = (cycleCountRef.current / 3) * 0.15;
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, "#0d1220");
      skyGrad.addColorStop(0.45, `rgba(${20 + warmth * 40}, ${40 + warmth * 20}, ${65}, 1)`);
      skyGrad.addColorStop(0.75, `rgba(${30 + warmth * 50}, ${55 + warmth * 25}, ${70}, 1)`);
      skyGrad.addColorStop(0.92, `rgba(${20 + warmth * 60}, ${30 + warmth * 30}, ${20}, 1)`);
      skyGrad.addColorStop(1, "#0d1220");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Horizon glow — expands with each breath
      const glowR = 120 + bs * 40 + cycleCountRef.current * 30;
      const horizonY = h * 0.62;
      const hGlow = ctx.createRadialGradient(w / 2, horizonY, 0, w / 2, horizonY, glowR * 3);
      hGlow.addColorStop(0, `rgba(215, 165, 75, ${0.06 + bs * 0.08 + warmth * 0.08})`);
      hGlow.addColorStop(0.5, `rgba(200, 130, 60, ${0.03 + warmth * 0.04})`);
      hGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = hGlow;
      ctx.fillRect(0, 0, w, h);

      // Waves — 4 layers, each slightly different speed & amplitude
      const waveLayers = [
        { baseYFrac: 0.60, amp: 18, speed: 0.3, alpha: 0.55, shimmer: 0.12 },
        { baseYFrac: 0.65, amp: 14, speed: 0.2, alpha: 0.65, shimmer: 0.09 },
        { baseYFrac: 0.70, amp: 10, speed: 0.15, alpha: 0.78, shimmer: 0.07 },
        { baseYFrac: 0.76, amp: 7, speed: 0.1, alpha: 0.92, shimmer: 0.05 },
      ];

      waveLayers.forEach((layer, i) => {
        // breathState affects amplitude (bs=1 → more amplitude) and baseY (bs=1 → wave rises)
        const amplitude = layer.amp * (0.7 + bs * 0.6);
        const baseY = h * layer.baseYFrac - bs * 22;
        const phaseOffset = i * 1.1;

        ctx.beginPath();
        ctx.moveTo(0, baseY);
        for (let x = 0; x <= w; x += 8) {
          const y =
            baseY +
            Math.sin(x * 0.012 + time * layer.speed * 4 + phaseOffset) * amplitude +
            Math.sin(x * 0.006 + time * layer.speed * 2.3 + phaseOffset * 1.5) * amplitude * 0.4;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();

        const waveGrad = ctx.createLinearGradient(0, baseY, 0, h);
        waveGrad.addColorStop(0, `rgba(13, 20, 45, ${layer.alpha})`);
        waveGrad.addColorStop(1, `rgba(8, 12, 25, ${layer.alpha})`);
        ctx.fillStyle = waveGrad;
        ctx.fill();

        // Crest shimmer — moonlight + lantern gold
        ctx.strokeStyle = `rgba(215, 165, 75, ${layer.shimmer + bs * 0.04})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });

      // Sky particles
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < -5) p.x = w + 5;
        if (p.y < -5) p.y = h * 0.6;
        const [pr, pg, pb] = p.color;
        const pulseAlpha = p.opacity * (0.5 + 0.5 * Math.sin(time * 1.2 + p.x * 0.01));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pr},${pg},${pb},${pulseAlpha})`;
        ctx.fill();
      });
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
      ctx.fillStyle = "#0d1220";
      ctx.fillRect(0, 0, w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, []); // single loop — never restarts

  // Orb scale driven by breathState display interpolation
  const orbScale = 0.8 + displayPhase === "inhale" ? 0.7 : 0;

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" />

      {/* Title */}
      <div className="absolute inset-0 flex flex-col items-center pt-[env(safe-area-inset-top)] z-10 pointer-events-none">
        <div className="mt-12 text-center px-6">
          <div className="flex flex-col items-center gap-1">
            <span
              className="font-serif text-[#D7A54B] whitespace-nowrap"
              style={{
                fontSize: "clamp(1.45rem, 6.5vw, 1.75rem)",
                textShadow: "0 0 30px rgba(215,165,75,0.35), 0 0 60px rgba(215,165,75,0.15)",
                lineHeight: 1.25,
              }}
            >
              The tide is here.
            </span>
            <span
              className="font-serif text-[#D7A54B]/75 whitespace-nowrap"
              style={{
                fontSize: "clamp(1.2rem, 5.2vw, 1.45rem)",
                textShadow: "0 0 24px rgba(215,165,75,0.25), 0 0 48px rgba(215,165,75,0.1)",
                lineHeight: 1.25,
              }}
            >
              So are you.
            </span>
          </div>
          <p className="font-sans font-light text-lg text-[#D7A54B]/60 mt-3 tracking-wide">
            Breathe with the waves.
          </p>
        </div>
      </div>

      {/* Breathing orb + instruction */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
        {!completed ? (
          <div className="flex flex-col items-center gap-6">
            <div
              className="rounded-full transition-all ease-in-out"
              style={{
                width: "100px",
                height: "100px",
                background: "radial-gradient(circle, rgba(215,165,75,0.35) 0%, rgba(215,165,75,0.08) 60%, transparent 80%)",
                boxShadow: "0 0 40px rgba(215,165,75,0.2), inset 0 0 20px rgba(215,165,75,0.1)",
                transform: `scale(${displayPhase === "inhale" ? 1.55 : 0.75})`,
                opacity: displayPhase === "inhale" ? 0.85 : 0.3,
                transition: "transform 4500ms cubic-bezier(0.4,0,0.2,1), opacity 4500ms cubic-bezier(0.4,0,0.2,1)",
              }}
            />
            <p
              className="font-sans font-light text-sm tracking-[0.25em] uppercase text-[#D7A54B]/55 transition-opacity duration-1000"
            >
              {displayPhase === "inhale" ? "breathe in..." : "breathe out..."}
            </p>
          </div>
        ) : (
          <p
            className="font-serif italic text-2xl text-[#D7A54B] fade-up"
            style={{ textShadow: "0 0 20px rgba(215,165,75,0.4)" }}
          >
            beautifully done.
          </p>
        )}
      </div>

      {/* Breath dots */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-4 z-10 pointer-events-none" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full transition-all duration-1000"
            style={{
              background: i < cycleCount ? "#D7A54B" : "rgba(215,165,75,0.18)",
              boxShadow: i < cycleCount ? "0 0 10px rgba(215,165,75,0.7)" : "none",
            }}
          />
        ))}
      </div>

      {/* Skip */}
      <button
        onClick={onNext}
        data-testid="button-skip"
        className="absolute top-6 right-6 font-sans text-xs text-[#D7A54B]/30 hover:text-[#D7A54B]/60 transition-colors z-20"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        skip →
      </button>
    </div>
  );
}
