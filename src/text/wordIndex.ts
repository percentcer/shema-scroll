import type { BakedWord } from './bake';

interface LineBucket {
  line: number;
  /** UV v range covered by this line's hit rects (v0 < v1). */
  v0: number;
  v1: number;
  words: BakedWord[];
}

/** uv → word lookup: binary search the line, scan its few x-intervals. */
export class WordIndex {
  private lines: LineBucket[] = [];

  constructor(words: BakedWord[]) {
    const byLine = new Map<number, BakedWord[]>();
    for (const w of words) {
      (byLine.get(w.line) ?? byLine.set(w.line, []).get(w.line)!).push(w);
    }
    this.lines = [...byLine.entries()]
      .map(([line, ws]) => ({
        line,
        v0: Math.min(...ws.map((w) => w.hitUvRect.v0)),
        v1: Math.max(...ws.map((w) => w.hitUvRect.v1)),
        words: ws,
      }))
      .sort((a, b) => b.v1 - a.v1); // top of canvas = high v, reading order first
  }

  lookup(u: number, v: number): BakedWord | null {
    let lo = 0;
    let hi = this.lines.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const line = this.lines[mid];
      if (v > line.v1) hi = mid - 1;
      else if (v < line.v0) lo = mid + 1;
      else {
        for (const w of line.words) {
          const r = w.hitUvRect;
          if (u >= r.u0 && u <= r.u1 && v >= r.v0 && v <= r.v1) return w;
        }
        return null;
      }
    }
    return null;
  }
}
