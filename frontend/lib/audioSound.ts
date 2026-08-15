/**
 * 100% Offline Audio Synthesizer via Web Audio API.
 * Generates rich acoustic chimes with zero external audio assets.
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private enabled = true;

  constructor() {
    if (typeof window !== "undefined") {
      this.enabled = localStorage.getItem("DREAMLANE_AUDIO_ENABLED") !== "false";
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("DREAMLANE_AUDIO_ENABLED", this.enabled ? "true" : "false");
    }
    return this.enabled;
  }

  private playTone(freq: number, type: OscillatorType, startTime: number, duration: number, gainValue = 0.15) {
    const ctx = this.initCtx();
    if (!ctx || !this.enabled) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /** Melodic intake chime when a new booking arrives */
  public bookingReceived() {
    const ctx = this.initCtx();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;
    this.playTone(523.25, "sine", now, 0.25, 0.2); // C5
    this.playTone(659.25, "sine", now + 0.1, 0.3, 0.2); // E5
    this.playTone(783.99, "sine", now + 0.2, 0.45, 0.25); // G5
  }

  /** Crisp chime when moving a car to the next bay */
  public stageBump() {
    const ctx = this.initCtx();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;
    this.playTone(659.25, "triangle", now, 0.15, 0.2); // E5
    this.playTone(880.0, "sine", now + 0.08, 0.35, 0.22); // A5
  }

  /** Celebration chime when vehicle is marked Ready for Delivery */
  public carReady() {
    const ctx = this.initCtx();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;
    this.playTone(523.25, "sine", now, 0.2, 0.2); // C5
    this.playTone(659.25, "sine", now + 0.08, 0.2, 0.2); // E5
    this.playTone(783.99, "sine", now + 0.16, 0.2, 0.2); // G5
    this.playTone(1046.5, "sine", now + 0.24, 0.5, 0.3); // C6
  }

  /** Register printer / invoice print chime */
  public invoicePrint() {
    const ctx = this.initCtx();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;
    this.playTone(392.0, "sine", now, 0.12, 0.18); // G4
    this.playTone(493.88, "sine", now + 0.06, 0.25, 0.2); // B4
  }
}

export const sound = new AudioSynthesizer();
