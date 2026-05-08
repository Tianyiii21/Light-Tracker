import React, { useRef, useState, useCallback } from "react";

interface AudioToggleProps {
  className?: string;
}

export function AudioToggle({ className = "" }: AudioToggleProps) {
  const [enabled, setEnabled] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const buildOceanNode = (ctx: AudioContext) => {
    // White noise buffer (4 seconds, looped)
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Low-pass filter for ocean rumble
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 400;
    lpf.Q.value = 0.5;

    // Bandpass for mid-wave texture
    const bpf = ctx.createBiquadFilter();
    bpf.type = "bandpass";
    bpf.frequency.value = 180;
    bpf.Q.value = 0.3;

    // Slow LFO to modulate filter frequency — creates wave rhythm
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12; // very slow, ~1 wave per 8 seconds
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain);
    lfoGain.connect(lpf.frequency);
    lfo.start();

    // Second LFO for gentle swell variation
    const lfo2 = ctx.createOscillator();
    lfo2.frequency.value = 0.07;
    const lfoGain2 = ctx.createGain();
    lfoGain2.gain.value = 60;
    lfo2.connect(lfoGain2);
    lfoGain2.connect(lpf.frequency);
    lfo2.start();

    // Main gain (master volume)
    const master = ctx.createGain();
    master.gain.value = 0;

    source.connect(lpf);
    lpf.connect(bpf);
    bpf.connect(master);

    // Mix some raw lpf signal back in for warmth
    const wet = ctx.createGain();
    wet.gain.value = 0.4;
    lpf.connect(wet);
    wet.connect(master);

    master.connect(ctx.destination);
    source.start();

    return master;
  };

  const toggle = useCallback(() => {
    if (!enabled) {
      // Start audio
      const ctx = new AudioContext();
      const masterGain = buildOceanNode(ctx);
      ctxRef.current = ctx;
      gainRef.current = masterGain;
      // Fade in
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 2.5);
      setEnabled(true);
    } else {
      // Fade out then stop
      const ctx = ctxRef.current;
      const gain = gainRef.current;
      if (ctx && gain) {
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
        setTimeout(() => {
          ctx.close().catch(() => {});
          ctxRef.current = null;
          gainRef.current = null;
        }, 1600);
      }
      setEnabled(false);
    }
  }, [enabled]);

  return (
    <button
      onClick={toggle}
      data-testid="button-audio-toggle"
      className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-500 ${
        enabled
          ? "text-[#D7A54B]/70 bg-[#D7A54B]/10"
          : "text-[#D7A54B]/30 hover:text-[#D7A54B]/50"
      } ${className}`}
      title={enabled ? "Mute ocean ambience" : "Play ocean ambience"}
      aria-label={enabled ? "Mute" : "Play ocean ambience"}
    >
      {enabled ? (
        // Wave icon (active)
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
          <path d="M2 17c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
          <path d="M2 7c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
        </svg>
      ) : (
        // Muted wave icon
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" opacity="0.4" />
          <path d="M2 17c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" opacity="0.4" />
          <path d="M2 7c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" opacity="0.4" />
        </svg>
      )}
    </button>
  );
}
