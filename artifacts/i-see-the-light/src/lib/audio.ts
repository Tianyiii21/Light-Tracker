export type Atmosphere = "ocean" | "starry";

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oceanGain: GainNode | null = null;
  private starryGain: GainNode | null = null;
  private swellGain: GainNode | null = null;   // separate node for release swell
  private convolver: ConvolverNode | null = null;
  private currentAtmosphere: Atmosphere = "ocean";
  private enabled = false;
  private toneTimer: ReturnType<typeof setTimeout> | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;

  // Must be called from a user gesture (iOS AudioContext policy)
  async start(): Promise<void> {
    // Cancel any pending suspend
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
        this.scheduleTone(); // restart sparse tones
      }
      return;
    }

    try {
      const ctx = new AudioContext();
      this.ctx = ctx;

      // Master gain — fades all audio in/out
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      this.masterGain = master;

      // Atmosphere gain nodes
      const oceanGain = ctx.createGain();
      oceanGain.gain.value = 1; // ocean is default on start
      oceanGain.connect(master);
      this.oceanGain = oceanGain;

      const starryGain = ctx.createGain();
      starryGain.gain.value = 0;
      starryGain.connect(master);
      this.starryGain = starryGain;

      this.buildOcean(ctx, oceanGain);
      this.buildStarry(ctx, starryGain);

      // Fade in
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
    if (this.toneTimer !== null) {
      clearTimeout(this.toneTimer);
      this.toneTimer = null;
    }

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

  // Called during lantern release — swells the pad gently then returns
  triggerReleaseSwell(): void {
    if (!this.ctx || !this.swellGain || !this.enabled) return;
    const g = this.swellGain;
    const now = this.ctx.currentTime;
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(1.65, now + 2.2);
    g.gain.setValueAtTime(1.65, now + 4.5);
    g.gain.linearRampToValueAtTime(1.0, now + 8);
  }

  // ---- Private builders ----

  private buildOcean(ctx: AudioContext, dest: AudioNode): void {
    // Noise buffer (4s, looped)
    const bufSize = ctx.sampleRate * 4;
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    // Primary wave layer — bandpass filtered noise modulated by LFO
    const noise1 = ctx.createBufferSource();
    noise1.buffer = noiseBuf;
    noise1.loop = true;

    const bpf1 = ctx.createBiquadFilter();
    bpf1.type = "bandpass";
    bpf1.frequency.value = 340;
    bpf1.Q.value = 0.9;

    const noiseEnv1 = ctx.createGain();
    noiseEnv1.gain.value = 0.2;

    // LFO — slow wave rhythm (0.12 Hz ≈ one wave crest every 8s)
    const lfo1 = ctx.createOscillator();
    lfo1.frequency.value = 0.12;
    const lfoAmt1 = ctx.createGain();
    lfoAmt1.gain.value = 0.12;
    lfo1.connect(lfoAmt1);
    lfoAmt1.connect(noiseEnv1.gain);

    noise1.connect(bpf1);
    bpf1.connect(noiseEnv1);
    noiseEnv1.connect(dest);

    // Secondary wave layer — slightly different texture
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
    lfo2.frequency.value = 0.07; // slightly slower
    const lfoAmt2 = ctx.createGain();
    lfoAmt2.gain.value = 0.08;
    lfo2.connect(lfoAmt2);
    lfoAmt2.connect(noiseEnv2.gain);

    noise2.connect(bpf2);
    bpf2.connect(noiseEnv2);
    noiseEnv2.connect(dest);

    // Low-frequency rumble (standing on wet sand)
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
    // Convolver reverb — spacious 3.5s tail
    const revDur = 3.5;
    const revBuf = ctx.createBuffer(2, Math.floor(ctx.sampleRate * revDur), ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = revBuf.getChannelData(c);
      for (let i = 0; i < revBuf.length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revBuf.length, 2.8);
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = revBuf;
    this.convolver = conv;
    conv.connect(dest);

    // Warm ambient pad — 3 slightly detuned sine oscillators
    const padFreqs = [220.0, 221.4, 218.7];
    const swellGain = ctx.createGain();
    swellGain.gain.value = 1;
    this.swellGain = swellGain;
    swellGain.connect(dest);
    swellGain.connect(conv);

    padFreqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0.028;
      osc.connect(g);
      g.connect(swellGain);
      osc.start();
    });
  }

  private scheduleTone(): void {
    if (!this.enabled || !this.ctx) return;
    const delay = 3000 + Math.random() * 5000; // 3–8 seconds
    this.toneTimer = setTimeout(() => {
      this.playSparseTone();
      this.scheduleTone();
    }, delay);
  }

  private playSparseTone(): void {
    if (!this.ctx || !this.convolver || !this.enabled) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const freq = 800 + Math.random() * 1600; // 800–2400 Hz
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;

    const g = ctx.createGain();
    g.gain.value = 0;

    osc.connect(g);
    g.connect(this.convolver); // reverb send only — keeps it ethereal

    osc.start(now);
    // Slow attack
    g.gain.linearRampToValueAtTime(0.048, now + 0.65);
    // Hold briefly
    g.gain.setValueAtTime(0.048, now + 0.9);
    // Long release
    g.gain.linearRampToValueAtTime(0, now + 2.6);

    setTimeout(() => {
      try { osc.stop(); osc.disconnect(); g.disconnect(); } catch { /* ignore */ }
    }, 2800);
  }
}

// Singleton — shared across all components
export const audioEngine = new AudioEngine();
