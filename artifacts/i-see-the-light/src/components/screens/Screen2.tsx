import React, { useEffect, useState } from "react";
import { useGeneratePoetry } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Mood } from "../../lib/store";

interface Screen2Props {
  onNext: () => void;
  selectedMood: Mood | null;
  setSelectedMood: (m: Mood) => void;
}

export default function Screen2({ onNext, selectedMood, setSelectedMood }: Screen2Props) {
  const { mutate: generatePoetry, data: poetryData, isPending } = useGeneratePoetry();
  const [quote, setQuote] = useState("Today feels softer somehow.");

  useEffect(() => {
    generatePoetry(
      { data: { type: "morning_quote" } },
      {
        onSuccess: (data) => {
          if (data?.text) setQuote(data.text);
        },
      }
    );
  }, []);

  const moods: { id: Mood; emoji: string; label: string }[] = [
    { id: "clear", emoji: "☀️", label: "Clear" },
    { id: "soft", emoji: "🌤", label: "Soft" },
    { id: "heavy", emoji: "🌧", label: "Heavy" },
    { id: "quiet", emoji: "🌙", label: "Quiet" },
  ];

  return (
    <div className="w-full min-h-screen overflow-y-auto pt-16 pb-24 px-6 relative flex flex-col items-center">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(215,165,75,0.10) 0%, #1a2332 60%, #1a2535 90%, #0d1220 100%)" }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#d7a54b]/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-8">
        <div className="text-center fade-up delay-100">
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-[#D7A54B]/60 mb-3">follow the light</p>
          <h1 className="font-serif text-4xl text-[#D7A54B] drop-shadow-[0_0_15px_rgba(215,165,75,0.3)] mb-2">
            I See the Light
          </h1>
          <p className="font-sans italic text-[#D7A54B]/50">
            {format(new Date(), "MMMM do, yyyy")}
          </p>
        </div>

        <div className="w-16 h-[1px] bg-[#D7A54B]/20 fade-up delay-200" />

        {/* Mood Panel */}
        <div className="w-full glass-panel rounded-2xl p-6 flex flex-col items-center gap-4 fade-up delay-300">
          <p className="font-sans text-xs uppercase tracking-widest text-[#D7A54B]/60">how does today feel?</p>
          <div className="flex gap-3 w-full justify-between">
            {moods.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMood(m.id)}
                className={`flex flex-col items-center gap-2 flex-1 py-4 rounded-xl transition-all duration-300 ${
                  selectedMood === m.id 
                    ? "bg-[#D7A54B]/20 shadow-[0_4px_20px_rgba(215,165,75,0.2)] border border-[#D7A54B]/40" 
                    : "bg-white/5 border border-transparent hover:bg-white/10"
                }`}
              >
                <span className="text-2xl" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>{m.emoji}</span>
                <span className="font-sans text-xs text-[#D7A54B]/80">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quote Panel */}
        <div className="w-full glass-panel rounded-2xl p-6 flex flex-col items-center text-center gap-4 fade-up delay-400">
          <p className="font-sans text-xs uppercase tracking-widest text-[#D7A54B]/60">today's light</p>
          <div className="min-h-[60px] flex items-center justify-center">
            {isPending ? (
              <p className="font-serif italic text-lg text-[#D7A54B]/50 animate-pulse">finding today's light...</p>
            ) : (
              <p className="font-serif italic text-xl text-[#D7A54B]/90 leading-relaxed transition-opacity duration-1000">
                "{quote}"
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onNext}
          disabled={!selectedMood}
          className={`mt-4 px-8 py-3 rounded-full glass-panel font-serif italic text-lg transition-all duration-500 fade-up delay-500 ${
            selectedMood 
              ? "text-[#D7A54B] hover:bg-[#D7A54B]/10 hover:shadow-[0_0_20px_rgba(215,165,75,0.3)] cursor-pointer" 
              : "text-[#D7A54B]/30 opacity-50 cursor-not-allowed"
          }`}
        >
          carry this light forward &rarr;
        </button>
      </div>
    </div>
  );
}