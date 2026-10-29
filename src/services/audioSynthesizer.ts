/**
 * Zero-dependency Web Audio API procedural sound synthesizer
 * Eliminates 404 external audio failures and generates responsive retro & arcade tones.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted: boolean = false;
  private volume: number = 0.8;
  private lastHoverAt = 0;
  private suspendedByPause = false;

  constructor() {
    // Lazily initialized on first user interaction to comply with browser autoplay policy
  }

  private initCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.volume;
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setPaused(paused: boolean): void {
    if (!this.ctx) return;
    if (paused) {
      if (this.ctx.state === 'running') {
        this.suspendedByPause = true;
        void this.ctx.suspend();
      }
      return;
    }
    if (!this.suspendedByPause) return;
    this.suspendedByPause = false;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) this.masterGain.gain.value = this.volume;
  }

  private playUiTone(startHz: number, endHz: number, duration: number, type: OscillatorType, peak: number): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const endAt = ctx.currentTime + duration;
    osc.type = type;
    osc.frequency.setValueAtTime(startHz, ctx.currentTime);
    if (endHz !== startHz) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endHz), endAt);
    gain.gain.setValueAtTime(peak, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, endAt);
    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);
    osc.start();
    osc.stop(endAt);
  }

  public playHover(): void {
    const now = typeof performance === 'undefined' ? Date.now() : performance.now();
    if (now - this.lastHoverAt < 70) return;
    this.lastHoverAt = now;
    this.playUiTone(620, 760, 0.025, 'sine', 0.018);
  }

  public playOpen(): void {
    this.playUiTone(420, 820, 0.085, 'triangle', 0.045);
  }

  public playClose(): void {
    this.playUiTone(720, 380, 0.075, 'triangle', 0.04);
  }

  public playClick(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  }

  public playJump(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(580, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  public playDash(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  public playScore(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(0.08, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * 0.04 + 0.05);
      osc.connect(gain);
      gain.connect(this.masterGain || ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + (i + 1) * 0.04 + 0.05);
    });
  }

  public playLaser(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  public playHit(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  public playExplosion(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    // Low frequency rumble
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  }

  public playPongBeep(isHigh = false): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    const freq = isHigh ? 440 : 220;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  }
}

export const audio = new SoundEngine();
