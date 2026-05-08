import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Screen1 from "./components/screens/Screen1";
import Screen2 from "./components/screens/Screen2";
import Screen3 from "./components/screens/Screen3";
import Screen4 from "./components/screens/Screen4";
import { AudioToggle } from "./components/ui/AudioToggle";
import { Mood } from "./lib/store";
import { audioEngine } from "./lib/audio";

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: { retry: 1 },
  },
});

export type ScreenType = 1 | 2 | 3 | 4;

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(1);
  const [fading, setFading] = useState(false);

  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [screen3PostRelease, setScreen3PostRelease] = useState(false);
  const [savedClosingLine, setSavedClosingLine] = useState(
    "Tonight will keep this light safe."
  );

  const navigate = (screen: ScreenType, opts?: { screen3Post?: boolean }) => {
    if (fading) return;
    setFading(true);

    // Switch audio atmosphere — crossfade begins immediately
    if (screen === 1 || screen === 2) {
      audioEngine.setAtmosphere("ocean", 3);
    } else {
      // Screens 3 & 4 → starry atmosphere
      audioEngine.setAtmosphere("starry", 3);
    }

    if (screen === 3) {
      setScreen3PostRelease(opts?.screen3Post ?? false);
    }

    setTimeout(() => {
      setCurrentScreen(screen);
      setFading(false);
    }, 1800);
  };

  return (
    <div
      className="relative w-full bg-[#0d1220] overflow-hidden"
      style={{ height: "100dvh" }}
    >
      {/* Audio toggle — always visible, top-left */}
      <div
        className="absolute z-50"
        style={{
          top: "calc(env(safe-area-inset-top) + 14px)",
          left: "14px",
        }}
      >
        <AudioToggle />
      </div>

      {/* Screen container with cross-fade */}
      <div
        className="absolute inset-0 transition-opacity ease-in-out"
        style={{
          opacity: fading ? 0 : 1,
          transitionDuration: "1800ms",
          pointerEvents: fading ? "none" : "auto",
        }}
      >
        {currentScreen === 1 && <Screen1 onNext={() => navigate(2)} />}

        {currentScreen === 2 && (
          <Screen2
            onNext={() => navigate(3)}
            selectedMood={selectedMood}
            setSelectedMood={setSelectedMood}
          />
        )}

        {currentScreen === 3 && (
          <Screen3
            onNext={() => navigate(4)}
            selectedMood={selectedMood ?? "clear"}
            initialState={screen3PostRelease ? "settled" : "writing"}
            savedClosingLine={savedClosingLine}
            onClosingLineSaved={setSavedClosingLine}
          />
        )}

        {currentScreen === 4 && (
          <Screen4 onBack={() => navigate(3, { screen3Post: true })} />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
