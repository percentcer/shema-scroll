import type { TimingEntry } from '../dev/timingTool';
import type { AudioEngine, Voice } from './engine';

export interface KaraokeEvents {
  word: { id: string; index: number };
  ended: Record<string, never>;
}

/**
 * Continuous play mode: one long segment; each frame, binary-search the
 * timing map for the current word to drive highlight + auto-following yad.
 */
export class KaraokePlayer extends EventTarget {
  private voice: Voice | null = null;
  private words: TimingEntry[] = [];
  private currentIndex = -1;
  private raf = 0;
  playing = false;

  constructor(
    private engine: AudioEngine,
    private track: string,
  ) {
    super();
  }

  on<K extends keyof KaraokeEvents>(type: K, fn: (detail: KaraokeEvents[K]) => void) {
    this.addEventListener(type, (e) => fn((e as CustomEvent).detail));
    return this;
  }

  get currentWordId(): string | null {
    return this.words[this.currentIndex]?.id ?? null;
  }

  /** Start playing from a word (default: the first). */
  play(fromWordId?: string) {
    this.stop();
    // Timing loads lazily — tracks may still be downloading at construction.
    this.words = this.engine.timing(this.track)?.words ?? [];
    if (!this.words.length) return;
    const startIdx = fromWordId ? this.words.findIndex((w) => w.id === fromWordId) : 0;
    const start = this.words[Math.max(0, startIdx)].start;
    const end = this.engine.duration(this.track);
    this.voice = this.engine.playSegment(this.track, start, end, { fadeIn: 0.03, fadeOut: 0.1 });
    if (!this.voice) return;
    this.playing = true;
    this.tick();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.voice?.stop(0.1);
    this.voice = null;
    this.playing = false;
    this.currentIndex = -1;
  }

  private tick = () => {
    if (!this.voice) return;
    const elapsed = this.engine.ctx.currentTime - this.voice.startedAt + this.voice.offset;

    if (elapsed >= this.engine.duration(this.track) - 0.05) {
      this.playing = false;
      this.voice = null;
      this.dispatchEvent(new CustomEvent('ended', { detail: {} }));
      return;
    }

    // Binary search: last word whose start <= elapsed.
    let lo = 0;
    let hi = this.words.length - 1;
    let idx = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.words[mid].start <= elapsed) {
        idx = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    if (idx !== this.currentIndex && idx >= 0 && elapsed <= this.words[idx].end + 0.35) {
      this.currentIndex = idx;
      this.dispatchEvent(
        new CustomEvent('word', { detail: { id: this.words[idx].id, index: idx } }),
      );
    }
    this.raf = requestAnimationFrame(this.tick);
  };
}
