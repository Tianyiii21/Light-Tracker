import React, { useEffect, useState, useRef } from "react";
import { useGeneratePoetry } from "@workspace/api-client-react";
import { Mood, getMoodColor, saveEntry } from "../../lib/store";

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

  useEffect(() => {
    generatePoetry(
      { data: { type: "gratitude_header" } },
      { onSuccess: (data) => { if (data?.text) setHeader(data.text); } }
    );
  }, []);

  const handleRelease = () => {
    setReleasing(true);
    
    // Save entry
    const filledGratitudes = gratitudes.filter(g => g.trim() !== "");
    saveEntry({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mood: selectedMood,
      gratitudes: filledGratitudes,
      lanternColor: getMoodColor(selectedMood)
    });

    // Fetch closing line
    generatePoetry(
      { data: { type: "closing_line" } },
      { onSuccess: (data) => { if (data?.text) setClosingLine(data.text); } }
    );

    // Trigger canvas animation
    startLanternAnimation(filledGratitudes.length);
  };

  const startLanternAnimation = (count: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    
    const color = getMoodColor(selectedMood);
    
    let lanterns = Array.from({ length: count }).map((_, i) => ({
      x: w / 2 + (Math.random() - 0.5) * 100,
      y: h - 100,
      size: Math.random() * 5 + 15,
      speedY: Math.random() * 0.5 + 0.5,
      wobbleOffset: Math.random() * Math.PI * 2,
      opacity: 0
    }));

    let particles = Array.from({ length: 30 }).map(() => ({
      x: w / 2 + (Math.random() - 0.5) * 200,
      y: h,
      size: Math.random() * 2 + 1,
      speedY: Math.random() * 1 + 1,
      speedX: (Math.random() - 0.5) * 0.5,
      opacity: Math.random()
    }));

    const render = () => {
      ctx.clearRect(0, 0, w, h);

      // Particles
      particles.forEach(p => {
        p.y -= p.speedY;
        p.x += p.speedX;
        ctx.fillStyle = `rgba(215, 165, 75, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Lanterns
      lanterns.forEach(l => {
        if (l.opacity < 1) l.opacity += 0.01;
        l.y -= l.speedY;
        l.x += Math.sin(l.y * 0.01 + l.wobbleOffset) * 0.5;
        
        ctx.save();
        ctx.translate(l.x, l.y);
        
        // Glow
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, l.size * 3);
        gradient.addColorStop(0, color.replace(')', ', 0.8)').replace('rgb', 'rgba'));
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, l.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, l.size, l.size * 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });

      if (lanterns.some(l => l.y > -100)) {
        requestAnimationFrame(render);
      } else {
        setShowClosing(true);
      }
    };
    
    requestAnimationFrame(render);
  };

  const hasInput = gratitudes.some(g => g.trim() !== "");
  const placeholders = [
    "a light I found today...",
    "something softly beautiful...",
    "a moment worth carrying..."
  ];

  return (
    <div className="w-full min-h-screen relative overflow-hidden flex flex-col items-center pt-20 px-6">
      <canvas ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none" />
      
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1220] via-[#0f1d2b] to-[#0a0f16]" />
      </div>

      <div className={`relative z-20 w-full max-w-md flex flex-col items-center gap-6 transition-opacity duration-1000 ${releasing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <h2 className="font-serif italic text-2xl text-[#D7A54B] text-center mb-8 fade-up delay-100">
          {isPending && header === "Small lights still found me today." ? "..." : header}
        </h2>

        {gratitudes.map((g, i) => (
          <div key={i} className="w-full glass-panel rounded-xl p-1 fade-up" style={{ animationDelay: `${(i+2)*100}ms` }}>
            <textarea
              value={g}
              onChange={(e) => {
                const newG = [...gratitudes];
                newG[i] = e.target.value;
                setGratitudes(newG);
              }}
              placeholder={placeholders[i]}
              className="w-full bg-transparent border-none outline-none resize-none p-4 font-serif italic text-lg text-[#fce5a3] placeholder:text-[#D7A54B]/30 min-h-[100px]"
              style={{ caretColor: '#D7A54B' }}
            />
          </div>
        ))}

        <button
          onClick={handleRelease}
          disabled={!hasInput}
          className={`mt-8 px-8 py-3 rounded-full glass-panel font-serif italic text-lg transition-all duration-500 fade-up delay-500 ${
            hasInput 
              ? "text-[#D7A54B] hover:bg-[#D7A54B]/10 hover:shadow-[0_0_20px_rgba(215,165,75,0.3)] cursor-pointer" 
              : "text-[#D7A54B]/30 opacity-50 cursor-not-allowed"
          }`}
        >
          Release to the Sky
        </button>
      </div>

      {showClosing && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
          <p className="font-serif italic text-2xl text-[#D7A54B] mb-12 drop-shadow-[0_0_10px_rgba(215,165,75,0.5)]">
            {closingLine}
          </p>
          <button
            onClick={onNext}
            className="px-8 py-3 rounded-full glass-panel font-serif italic text-lg text-[#D7A54B] hover:bg-[#D7A54B]/10 transition-all duration-500 animate-in fade-in zoom-in duration-1000 delay-1000 fill-mode-both"
          >
            Enter Your Memory Sky &rarr;
          </button>
        </div>
      )}
    </div>
  );
}