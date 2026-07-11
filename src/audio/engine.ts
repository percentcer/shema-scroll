import type { TimingMap } from '../dev/timingTool';

export interface Voice {
  /** Ramp down and stop. Safe to call more than once. */
  stop(fadeOut?: number): void;
  readonly startedAt: number;
  readonly offset: number;
}

const DEFAULT_FADE_IN = 0.015;
const DEFAULT_FADE_OUT = 0.04;

/**
 * Decoded-buffer segment player. Every playback is an AudioBufferSourceNode
 * slice through its own gain envelope — never a hard cut, never a click.
 */
export class AudioEngine {
  readonly ctx: AudioContext;
  private master: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private timings = new Map<string, TimingMap>();

  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
  }

  /** Must be called from a user gesture on iOS/Safari. */
  async unlock() {
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  async loadTrack(key: string, audioUrl: string, timingUrl: string) {
    const base = import.meta.env.BASE_URL;
    const [audioRes, timingRes] = await Promise.all([
      fetch(base + audioUrl),
      fetch(base + timingUrl),
    ]);
    const [bytes, timing] = await Promise.all([
      audioRes.arrayBuffer(),
      timingRes.json() as Promise<TimingMap>,
    ]);
    this.buffers.set(key, await this.ctx.decodeAudioData(bytes));
    this.timings.set(key, timing);
  }

  timing(key: string): TimingMap | undefined {
    return this.timings.get(key);
  }

  wordSlice(key: string, wordId: string): { start: number; end: number } | undefined {
    return this.timings.get(key)?.words.find((w) => w.id === wordId);
  }

  duration(key: string): number {
    return this.buffers.get(key)?.duration ?? 0;
  }

  playSegment(
    key: string,
    start: number,
    end: number,
    opts: { fadeIn?: number; fadeOut?: number; gain?: number } = {},
  ): Voice | null {
    const buffer = this.buffers.get(key);
    if (!buffer) return null;
    const { fadeIn = DEFAULT_FADE_IN, fadeOut = DEFAULT_FADE_OUT, gain = 1 } = opts;
    const now = this.ctx.currentTime;
    const dur = Math.max(0.05, end - start);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + fadeIn);
    env.gain.setValueAtTime(gain, now + dur);
    env.gain.linearRampToValueAtTime(0, now + dur + fadeOut);
    source.connect(env).connect(this.master);
    source.start(now, start, dur + fadeOut + 0.01);
    source.stop(now + dur + fadeOut + 0.02);

    let stopped = false;
    return {
      startedAt: now,
      offset: start,
      stop: (fo = DEFAULT_FADE_OUT) => {
        if (stopped) return;
        stopped = true;
        const t = this.ctx.currentTime;
        env.gain.cancelScheduledValues(t);
        env.gain.setValueAtTime(env.gain.value, t);
        env.gain.linearRampToValueAtTime(0, t + fo);
        source.stop(t + fo + 0.01);
      },
    };
  }
}
