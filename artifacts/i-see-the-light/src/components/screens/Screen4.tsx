import React, { useEffect, useState, useRef } from "react";
import { JournalEntry, loadEntries } from "../../lib/store";
import { format } from "date-fns";

interface Screen4Props {
  onBack: () => void;
}

export default function Screen4({ onBack }: Screen4Props) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || entries.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    // Generate random positions for entries, older = smaller
    const mappedEntries = entries.map((entry, i) => {
      const isRecent = i >= entries.length - 3;
      return {
        ...entry,
        x: Math.random() * (w - 100) + 50,
        y: Math.random() * (h - 200) + 100,
        size: isRecent ? Math.random() * 5 + 10 : Math.random() * 3 + 5,
        wobble: Math.random() * Math.PI * 2,
        speedY: (Math.random() * 0.1) + 0.05,
        opacity: isRecent ? 0.9 : 0.4
      };
    });

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, w, h);

      mappedEntries.forEach(l => {
        l.y -= l.speedY;
        l.x += Math.sin(l.y * 0.01 + l.wobble) * 0.2;
        
        // Wrap around
        if (l.y < -50) l.y = h + 50;

        ctx.save();
        ctx.translate(l.x, l.y);
        
        // Glow
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, l.size * 4);
        gradient.addColorStop(0, l.lanternColor.replace('rgb', 'rgba').replace(')', `, ${l.opacity})`));
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, l.size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = l.lanternColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, l.size, l.size * 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [entries]);

  return (
    <div className="w-full min-h-screen relative overflow-hidden flex flex-col items-center">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[#0d1220]">
        {/* Stars */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      </div>

      <canvas ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none" />

      <div className="relative z-20 w-full flex flex-col items-center pt-16 px-6">
        <h1 className="font-serif text-3xl text-[#D7A54B] drop-shadow-[0_0_15px_rgba(215,165,75,0.5)] mb-8 fade-up">
          Your Memory Sky
        </h1>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center text-center mt-32 fade-up delay-200">
            <p className="font-serif italic text-2xl text-[#D7A54B]/80 mb-4">Your sky is quiet tonight.</p>
            <p className="font-sans font-light text-[#D7A54B]/50">Release your first light to see it here.</p>
          </div>
        ) : (
          <div className="w-full max-w-md h-[60vh] relative z-30 overflow-y-auto">
            {/* Interactive layer for tapping lanterns - since canvas is non-interactive, we overlay invisible buttons for recent entries or list them */}
            <div className="flex flex-col gap-4 p-4">
              {entries.slice().reverse().map((entry, idx) => (
                <button
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className="glass-panel p-4 rounded-xl text-left transition-all hover:bg-white/10 fade-up"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <p className="font-sans text-xs text-[#D7A54B]/70 mb-2">{format(new Date(entry.date), "MMMM do, yyyy")} &bull; <span className="uppercase">{entry.mood}</span></p>
                  <p className="font-serif italic text-lg text-[#fce5a3] line-clamp-2">
                    {entry.gratitudes[0]}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onBack}
          className="absolute bottom-12 px-6 py-2 rounded-full glass-panel font-sans text-sm text-[#D7A54B]/70 hover:text-[#D7A54B] transition-colors fade-up delay-500 z-20"
        >
          &larr; Back to the Shore
        </button>
      </div>

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-[#0d1220]/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm glass-panel rounded-2xl p-8 relative flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setSelectedEntry(null)}
              className="absolute top-4 right-4 text-[#D7A54B]/50 hover:text-[#D7A54B] text-xl"
            >
              &times;
            </button>
            <div 
              className="w-12 h-16 rounded-[40%] blur-[2px] mb-6"
              style={{ backgroundColor: selectedEntry.lanternColor, boxShadow: `0 0 20px ${selectedEntry.lanternColor}` }}
            />
            <p className="font-sans text-xs uppercase tracking-widest text-[#D7A54B]/60 mb-1">
              {format(new Date(selectedEntry.date), "MMMM do, yyyy")}
            </p>
            <p className="font-sans text-xs text-[#D7A54B]/40 mb-8">{selectedEntry.mood} light</p>
            
            <div className="flex flex-col gap-6 w-full">
              {selectedEntry.gratitudes.map((g, i) => (
                <p key={i} className="font-serif italic text-xl text-[#fce5a3]">
                  {g}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}