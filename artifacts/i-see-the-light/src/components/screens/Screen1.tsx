import React, { useEffect, useRef, useState } from "react";

interface Screen1Props {
  onNext: () => void;
}

export default function Screen1({ onNext }: Screen1Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [breathPhase, setBreathPhase] = useState<"inhale" | "exhale">("inhale");
  const [cycleCount, setCycleCount] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    // Breathing logic
    if (cycleCount >= 3) {
      setCompleted(true);
      const timer = setTimeout(() => {
        onNext();
      }, 3000);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      if (breathPhase === "inhale") {
        setBreathPhase("exhale");
      } else {
        setBreathPhase("inhale");
        setCycleCount(c => c + 1);
      }
    }, 4500);

    return () => clearTimeout(timer);
  }, [breathPhase, cycleCount, onNext]);

  useEffect(() => {
    // Canvas animation
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    let time = 0;
    let targetAmplitudeMultiplier = breathPhase === "inhale" ? 1.5 : 0.8;
    let currentAmplitudeMultiplier = 1;

    const render = () => {
      time += 0.01;
      
      // Interpolate amplitude
      currentAmplitudeMultiplier += (targetAmplitudeMultiplier - currentAmplitudeMultiplier) * 0.02;

      ctx.clearRect(0, 0, w, h);

      // Sky gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, "#0d1220");
      gradient.addColorStop(0.7, "#1a3645");
      gradient.addColorStop(1, "#d7a54b33");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Waves
      const waveCount = 4;
      for (let i = 0; i < waveCount; i++) {
        ctx.beginPath();
        const baseY = h * 0.6 + (i * h * 0.1) - (currentAmplitudeMultiplier * 20);
        ctx.moveTo(0, baseY);

        for (let x = 0; x <= w; x += 10) {
          const dx = x * (0.01 + i * 0.005) + time * (0.5 + i * 0.2);
          const y = baseY + Math.sin(dx) * 20 * currentAmplitudeMultiplier;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.fillStyle = `rgba(13, 18, 32, ${0.4 + i * 0.2})`;
        ctx.fill();
        
        // Shimmer
        ctx.strokeStyle = `rgba(215, 165, 75, ${0.1 + i * 0.05})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      requestAnimationFrame(render);
    };

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    const animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
    };
  }, [breathPhase]);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      
      <div className="absolute inset-0 flex flex-col items-center justify-start pt-32 px-6 text-center z-10">
        <h1 className="font-serif text-4xl md:text-5xl text-[#D7A54B] mb-4" style={{ textShadow: '0 0 20px rgba(215,165,75,0.4)' }}>
          The tide is here. So are you.
        </h1>
        <p className="font-sans font-light text-xl text-[#D7A54B]/70">
          Breathe with the waves.
        </p>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 mt-32">
        {!completed ? (
          <>
            <div 
              className="w-32 h-32 rounded-full blur-2xl bg-[#D7A54B]/20 transition-all duration-[4500ms] ease-in-out"
              style={{
                transform: breathPhase === "inhale" ? "scale(1.5)" : "scale(0.8)",
                opacity: breathPhase === "inhale" ? 0.8 : 0.3
              }}
            />
            <p className="absolute font-sans font-light text-[#D7A54B]/60 tracking-widest uppercase text-sm transition-opacity duration-1000">
              {breathPhase === "inhale" ? "breathe in..." : "breathe out..."}
            </p>
          </>
        ) : (
          <p className="font-serif italic text-2xl text-[#D7A54B] fade-up">beautifully done.</p>
        )}
      </div>

      <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-4 z-10">
        {[0, 1, 2].map((i) => (
          <div 
            key={i} 
            className={`w-2 h-2 rounded-full transition-all duration-1000 ${
              i < cycleCount ? "bg-[#D7A54B] shadow-[0_0_8px_rgba(215,165,75,0.8)]" : "bg-[#D7A54B]/20"
            }`}
          />
        ))}
      </div>

      <button 
        onClick={onNext}
        className="absolute top-6 right-6 font-sans text-sm text-[#D7A54B]/40 hover:text-[#D7A54B] transition-colors z-20"
      >
        skip &rarr;
      </button>
    </div>
  );
}