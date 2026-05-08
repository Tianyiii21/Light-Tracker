import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Screen1 from "./components/screens/Screen1";
import Screen2 from "./components/screens/Screen2";
import Screen3 from "./components/screens/Screen3";
import Screen4 from "./components/screens/Screen4";
import { Mood } from "./lib/store";

const queryClient = new QueryClient();

export type ScreenType = 1 | 2 | 3 | 4;

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(1);
  const [transitioning, setTransitioning] = useState(false);
  const [nextScreen, setNextScreen] = useState<ScreenType | null>(null);

  // App State
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);

  const navigate = (screen: ScreenType) => {
    setTransitioning(true);
    setNextScreen(screen);
    setTimeout(() => {
      setCurrentScreen(screen);
      setTransitioning(false);
      setNextScreen(null);
    }, 2000); // 2s cross-fade
  };

  return (
    <div className="relative w-full h-[100dvh] bg-[#0d1220] overflow-hidden text-brand-gold">
      <div 
        className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${
          transitioning ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
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
            selectedMood={selectedMood || "clear"} 
          />
        )}
        {currentScreen === 4 && <Screen4 onBack={() => navigate(3)} />}
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;