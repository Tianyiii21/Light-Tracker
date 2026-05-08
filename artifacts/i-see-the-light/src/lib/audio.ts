export type Atmosphere = "ocean" | "starry";

// C5 pentatonic — warm register, feel like distant chimes or a music box
const PENTATONIC_HZ = [523, 659, 784, 1047, 1319];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oceanGain: GainNode | null = null;
  private starryGain: GainNode | null = null;
  private padGain: GainNode | null = null;    // controlled for release swell
  private convolver: ConvolverNode | null = null;
  private currentAtmosphere: Atmosphere = "ocean";
  private enabled = false;
  private toneTimer: ReturnType<typeof setTimeout> | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private swellActive = false;
  private swellResetTimer: ReturnType<typeof setTimeout> | null = null;

  // Must be called from a user gesture (iOS AudioContext policy)
  async start(): Promise<void> {
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }

    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      if (!this.enabled) {
        this.enabled = true;
        const now = this.ctx.currentTime;
        this.masterGain!.gain.setValueAtTime(0, now);
        this.masterGain!.gain.linearRampToValueAtTime(0.5, now + 2);
        this.scheduleTone();
      }
      return;
    }

    try {
      const ctx = new AudioContext();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      this.masterGain = master;

      const oceanGain = ctx.createGain();
      oceanGain.gain.value = 1;
      oceanGain.connect(master);
      this.oceanGain = oceanGain;

      const starryGain = ctx.createGain();
      starryGain.gain.value = 0;
      starryGain.connect(master);
      this.starryGain = starryGain;

      this.buildOcean(ctx, oceanGain);
      this.buildStarry(ctx, starryGain);

      master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2);
      this.enabled = true;
      this.scheduleTone();
    } catch {
      // Web Audio unavailable — fail silently
    }
  }

  stop(): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return;
    const ctx = this.ctx;
    const master = this.masterGain;

    this.enabled = false;
    if (this.toneTimer !== null) { clearTimeout(this.toneTimer); this.toneTimer = null; }
    if (this.swellResetTimer !== null) { clearTimeout(this.swellResetTimer); this.swellResetTimer = null; }

    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);

    this.stopTimer = setTimeout(() => {
      if (!this.enabled) ctx.suspend().catch(() => {});
      this.stopTimer = null;
    }, 2100);
  }

  setAtmosphere(atm: Atmosphere, duration = 3): void {
    if (!this.ctx || !this.oceanGain || !this.starryGain || !this.enabled) return;
    const now = this.ctx.currentTime;

    if (atm === "ocean") {
      this.oceanGain.gain.setValueAtTime(this.oceanGain.gain.value, now);
      this.oceanGain.gain.linearRampToValueAtTime(1, now + duration);
      this.starryGain.gain.setValueAtTime(this.starryGain.gain.value, now);
      this.starryGain.gain.linearRampToValueAtTime(0, now + duration);
    } else {
      this.oceanGain.gain.setValueAtTime(this.oceanGain.gain.value, now);
      this.oceanGain.gain.linearRampToValueAtTime(0, now + duration);
      this.starryGain.gain.setValueAtTime(this.starryGain.gain.value, now);
      this.starryGain.gain.linearRampToValueAtTime(1, now + duration);
    }

    this.currentAtmosphere = atm;
  }

  // Called during lantern release — plucked tones quicken, pad swells gently
  triggerReleaseSwell(): void {
    if (!this.ctx || !this.padGain || !this.enabled) return;
    const ctx = this.ctx;
    const pad = this.padGain;
    const now = ctx.currentTime;

    // Swell pad
    pad.gain.setValueAtTime(pad.gain.value, now);
    pad.gain.linearRampToValueAtTime(0.09, now + 2);

    // Speed up tone scheduling
    this.swellActive = true;

    // Return to normal after 6 seconds
    if (this.swellResetTimer) clearTimeout(this.swellResetTimer);
    this.swellResetTimer = setTimeout(() => {
      this.swellActive = false;
      if (this.padGain && this.ctx) {
        const n = this.ctx.currentTime;
        this.padGain.gain.setValueAtTime(this.padGain.gain.value, n);
        this.padGain.gain.linearRampToValueAtTime(0.04, n + 2.5);
      }
      this.swellResetTimer = null;
    }, 6000);
  }

  // ---- Private builders ----

  private buildOcean(ctx: AudioContext, dest: AudioNode): void {
    const bufSize = ctx.sampleRate * 4;
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    // Primary wave layer
    const noise1 = ctx.createBufferSource();
    noise1.buffer = noiseBuf;
    noise1.loop = true;

    const bpf1 = ctx.createBiquadFilter();
    bpf1.type = "bandpass";
    bpf1.frequency.value = 340;
    bpf1.Q.value = 0.9;

    const noiseEnv1 = ctx.createGain();
    noiseEnv1.gain.value = 0.2;

    const lfo1 = ctx.createOscillator();
    lfo1.frequency.value = 0.12;
    const lfoAmt1 = ctx.createGain();
    lfoAmt1.gain.value = 0.12;
    lfo1.connect(lfoAmt1);
    lfoAmt1.connect(noiseEnv1.gain);

    noise1.connect(bpf1);
    bpf1.connect(noiseEnv1);
    noiseEnv1.connect(dest);

    // Secondary wave layer
    const noise2 = ctx.createBufferSource();
    noise2.buffer = noiseBuf;
    noise2.loop = true;

    const bpf2 = ctx.createBiquadFilter();
    bpf2.type = "bandpass";
    bpf2.frequency.value = 190;
    bpf2.Q.value = 0.6;

    const noiseEnv2 = ctx.createGain();
    noiseEnv2.gain.value = 0.13;

    const lfo2 = ctx.createOscillator();
    lfo2.frequency.value = 0.07;
    const lfoAmt2 = ctx.createGain();
    lfoAmt2.gain.value = 0.08;
    lfo2.connect(lfoAmt2);
    lfoAmt2.connect(noiseEnv2.gain);

    noise2.connect(bpf2);
    bpf2.connect(noiseEnv2);
    noiseEnv2.connect(dest);

    // Low rumble
    const rumble = ctx.createOscillator();
    rumble.type = "sine";
    rumble.frequency.value = 68;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.016;
    rumble.connect(rumbleGain);
    rumbleGain.connect(dest);

    noise1.start();
    noise2.start();
    lfo1.start();
    lfo2.start();
    rumble.start();
  }

  private buildStarry(ctx: AudioContext, dest: AudioNode): void {
    // Convolver reverb — spacious tail for depth
    const revDur = 3.0;
    const revBuf = ctx.createBuffer(2, Math.floor(ctx.sampleRate * revDur), ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = revBuf.getChannelData(c);
      for (let i = 0; i < revBuf.length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revBuf.length, 2.2);
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = revBuf;
    this.convolver = conv;
    conv.connect(dest);

    // Warm pad — two detuned oscillators at C4, very low gain
    const padGain = ctx.createGain();
    padGain.gain.value = 0.04;
    this.padGain = padGain;

    [261.0, 263.0].forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(padGain);
      osc.start();
    });

    padGain.connect(dest);
    padGain.connect(conv); // reverb send
  }

  private scheduleTone(): void {
    if (!this.enabled || !this.ctx) return;
    // During swell: shorter 1–2s interval; normal: 1.5–3.5s
    const [lo, hi] = this.swellActive ? [1000, 2000] : [1500, 3500];
    const delay = lo + Math.random() * (hi - lo);

    this.toneTimer = setTimeout(() => {
      this.playPluckedTone();
      this.scheduleTone();
    }, delay);
  }

  private playPluckedTone(): void {
    if (!this.ctx || !this.convolver || !this.enabled) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Pick a random note from the pentatonic scale
    const freq = PENTATONIC_HZ[Math.floor(Math.random() * PENTATONIC_HZ.length)];
    // Slight gain variation for natural, human feel
    const gain = 0.06 + Math.random() * 0.04; // 0.06–0.10
    // Release time variation: 1.2–1.8s
    const releaseTime = 1.2 + Math.random() * 0.6;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;

    const g = ctx.createGain();
    g.gain.value = 0;

    osc.connect(g);
    g.connect(this.convolver); // reverb only — keeps it warm and distant

    osc.start(now);
    // Quick pluck attack
    g.gain.linearRampToValueAtTime(gain, now + 0.01);
    // Decay
    g.gain.setValueAtTime(gain, now + 0.04);
    g.gain.linearRampToValueAtTime(0, now + 0.04 + releaseTime);

    const totalMs = (0.04 + releaseTime + 0.1) * 1000;
    setTimeout(() => {
      try { osc.stop(); osc.disconnect(); g.disconnect(); } catch { /* ignore */ }
    }, totalMs);
  }
}

// Singleton — shared across all components
export const audioEngine = new AudioEngine();
