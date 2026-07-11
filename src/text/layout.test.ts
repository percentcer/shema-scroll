import { describe, expect, it } from 'vitest';
import { layoutColumn, splitRuns } from './layout';

// Fixed-advance mock: every char 10px at scale 1.
const measure = (text: string, scale: number) => [...text].length * 10 * scale;

const opts = {
  canvasWidth: 200,
  canvasHeight: 1000,
  fontPx: 20,
  lineHeightFactor: 1.5,
  margin: 10,
  enlargedScale: 1.6,
  measure,
};

describe('splitRuns', () => {
  it('returns one run when nothing is enlarged', () => {
    expect(splitRuns('שמע', undefined, 1.6)).toEqual([{ text: 'שמע', scale: 1 }]);
  });

  it('splits enlarged letters into their own runs', () => {
    expect(splitRuns('שמע', [2], 1.6)).toEqual([
      { text: 'שמ', scale: 1 },
      { text: 'ע', scale: 1.6 },
    ]);
  });

  it('merges consecutive enlarged letters', () => {
    expect(splitRuns('אבגד', [1, 2], 2)).toEqual([
      { text: 'א', scale: 1 },
      { text: 'בג', scale: 2 },
      { text: 'ד', scale: 1 },
    ]);
  });
});

describe('layoutColumn', () => {
  it('lays words right-to-left from the right margin', () => {
    const { boxes } = layoutColumn(
      [
        { id: 'w1', text: 'אב' }, // 20px
        { id: 'w2', text: 'גדה' }, // 30px
      ],
      opts,
    );
    expect(boxes[0].x + boxes[0].w).toBe(190); // right edge = canvas - margin
    expect(boxes[1].x + boxes[1].w).toBeLessThan(boxes[0].x); // second word further left
    expect(boxes[0].line).toBe(0);
  });

  it('wraps to the next line when a word passes the left margin', () => {
    const { boxes, lineCount } = layoutColumn(
      [
        { id: 'w1', text: 'אאאאאאאא' }, // 80px
        { id: 'w2', text: 'בבבבבבבב' }, // 80px
        { id: 'w3', text: 'גגגגגגגג' }, // 80px — doesn't fit after w1+w2+spaces
      ],
      opts,
    );
    expect(lineCount).toBe(2);
    expect(boxes[2].line).toBe(1);
    expect(boxes[2].x + boxes[2].w).toBe(190); // new line restarts at right margin
  });

  it('keeps one shared baseline per line regardless of enlarged letters', () => {
    const { boxes } = layoutColumn(
      [
        { id: 'w1', text: 'אב' },
        { id: 'w2', text: 'גד', enlarged: [1] },
      ],
      opts,
    );
    expect(boxes[0].baseline).toBe(boxes[1].baseline);
  });

  it('gives every word a hit rect larger than its ink rect', () => {
    const { boxes } = layoutColumn([{ id: 'w1', text: 'אבג' }], opts);
    const b = boxes[0];
    expect(b.hit.x).toBeLessThan(b.x);
    expect(b.hit.w).toBeGreaterThan(b.w);
    expect(b.hit.h).toBeGreaterThan(b.h);
  });
});
