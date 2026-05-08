import React, { useState, useCallback } from "react";
import { audioEngine } from "../../lib/audio";

interface AudioToggleProps {
  className?: string;
}

export function AudioToggle({ className = "" }: AudioToggleProps) {
  const [enabled, setEnabled] = useState(false);

  const toggle = useCallback(async () => {
    if (!enabled) {
      // Must start AudioContext inside user gesture (iOS requirement)
      await audioEngine.start();
      setEnabled(true);
    } else {
      audioEngine.stop();
      setEnabled(false);
    }
  }, [enabled]);

  return (
    <button
      onClick={toggle}
      data-testid="button-audio-toggle"
      title={enabled ? "Mute ocean ambience" : "Play ocean ambience"}
      aria-label={enabled ? "Mute" : "Play ambient sound"}
      className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-500 ${
        enabled
          ? "text-[#D7A54B]/65 bg-[#D7A54B]/08"
          : "text-[#D7A54B]/28 hover:text-[#D7A54B]/50"
      } ${className}`}
    >
      {enabled ? (
        /* Active — wave icon */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
          <path d="M2 17c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" opacity="0.5" />
          <path d="M2 7c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" opacity="0.5" />
        </svg>
      ) : (
        /* Inactive — muted wave */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" opacity="0.35" />
          <path d="M2 17c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" opacity="0.18" />
          <path d="M2 7c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" opacity="0.18" />
        </svg>
      )}
    </button>
  );
}
