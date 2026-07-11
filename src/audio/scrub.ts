import type { AudioEngine, Voice } from './engine';

const TRIGGER_THROTTLE_MS = 90;
const CROSSFADE = 0.04;
const HOLD_REPEAT_GAP_MS = 400;

/**
 * Velocity-aware word-segment scrubbing: each wordEnter crossfades to that
 * word's slice. Slow drags reconstruct near-continuous chant (slices abut in
 * the source); fast drags skip intermediates and become musical skimming.
 */
export class ScrubPlayer {
  private voice: Voice | null = null;
  private lastTrigger = 0;
  private pendingWord: string | null = null;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;
  private holdTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private engine: AudioEngine,
    private track: string,
  ) {}

  /** Yad entered a word: play its slice (throttled, crossfaded). */
  wordEnter(wordId: string) {
    this.stopHold();
    const now = performance.now();
    const since = now - this.lastTrigger;
    if (since < TRIGGER_THROTTLE_MS) {
      // Defer: if the yad is still on this word when the window opens, play it.
      this.pendingWord = wordId;
      if (!this.pendingTimer) {
        this.pendingTimer = setTimeout(() => {
          this.pendingTimer = null;
          if (this.pendingWord) {
            const w = this.pendingWord;
            this.pendingWord = null;
            this.trigger(w);
          }
        }, TRIGGER_THROTTLE_MS - since);
      }
      return;
    }
    this.trigger(wordId);
  }

  /** Yad is holding on a word: gentle practice-loop. */
  wordHold(wordId: string) {
    this.stopHold();
    const slice = this.engine.wordSlice(this.track, wordId);
    if (!slice) return;
    const len = (slice.end - slice.start) * 1000 + HOLD_REPEAT_GAP_MS;
    this.holdTimer = setInterval(() => this.trigger(wordId), len);
  }

  wordLeave() {
    this.pendingWord = null;
    this.stopHold();
  }

  stop() {
    this.pendingWord = null;
    this.stopHold();
    this.voice?.stop();
    this.voice = null;
  }

  private stopHold() {
    if (this.holdTimer) {
      clearInterval(this.holdTimer);
      this.holdTimer = null;
    }
  }

  private trigger(wordId: string) {
    const slice = this.engine.wordSlice(this.track, wordId);
    if (!slice) return;
    this.lastTrigger = performance.now();
    this.voice?.stop(CROSSFADE);
    this.voice = this.engine.playSegment(this.track, slice.start, slice.end, {
      fadeIn: CROSSFADE * 0.5,
    });
  }
}
