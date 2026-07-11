/**
 * Manual right-to-left word layout for the scroll bake.
 *
 * We never let the canvas lay out a whole line — every word is positioned by
 * hand so its rect is exact by construction. Pure logic: text measurement is
 * injected, so this module is unit-testable without a DOM.
 */

export interface LayoutWord {
  id: string;
  /** Consonantal scroll text. */
  text: string;
  /** Indices into `text` drawn enlarged (scribal tradition). */
  enlarged?: number[];
}

/** A run of consecutive letters sharing one scale factor. */
export interface GlyphRun {
  text: string;
  scale: number;
}

export interface PlacedRun extends GlyphRun {
  /** X of the run's RIGHT edge (RTL pen position), canvas px. */
  xRight: number;
}

export interface WordBox {
  id: string;
  line: number;
  /** Ink rect, canvas px, y-down. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Enlarged hit rect for forgiving yad aim. */
  hit: { x: number; y: number; w: number; h: number };
  runs: PlacedRun[];
  baseline: number;
}

export interface LayoutOptions {
  canvasWidth: number;
  canvasHeight: number;
  fontPx: number;
  /** Multiple of fontPx. */
  lineHeightFactor: number;
  margin: number;
  /** Scale factor for enlarged letters. */
  enlargedScale: number;
  /** Width of `text` at fontPx * scale. */
  measure: (text: string, scale: number) => number;
  /** Hit-rect padding as a fraction of line height. */
  hitPadFactor?: number;
}

export interface ColumnLayout {
  boxes: WordBox[];
  lineCount: number;
  lineHeight: number;
}

/** Split a word into runs of normal/enlarged letters, preserving string order. */
export function splitRuns(text: string, enlarged: number[] | undefined, enlargedScale: number): GlyphRun[] {
  if (!enlarged?.length) return [{ text, scale: 1 }];
  const runs: GlyphRun[] = [];
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const scale = enlarged.includes(i) ? enlargedScale : 1;
    const last = runs[runs.length - 1];
    if (last && last.scale === scale) last.text += chars[i];
    else runs.push({ text: chars[i], scale });
  }
  return runs;
}

/**
 * Lay out words right-to-left with simple greedy wrapping.
 * Hebrew string order maps to visual right-to-left: the first run in a word
 * is its rightmost, so runs are placed at a leftward-advancing pen.
 */
export function layoutColumn(words: LayoutWord[], opts: LayoutOptions): ColumnLayout {
  const {
    canvasWidth, canvasHeight, fontPx, lineHeightFactor, margin,
    enlargedScale, measure, hitPadFactor = 0.15,
  } = opts;
  const lineHeight = fontPx * lineHeightFactor;
  const spaceW = measure(' ', 1) || fontPx * 0.28;
  const rightEdge = canvasWidth - margin;
  const leftEdge = margin;
  const ascent = fontPx * 0.75; // STaM sits almost entirely above baseline; refined per-font if needed
  const descent = fontPx * 0.3;

  const boxes: WordBox[] = [];
  let penX = rightEdge;
  let line = 0;

  for (const word of words) {
    const runs = splitRuns(word.text, word.enlarged, enlargedScale);
    const widths = runs.map((r) => measure(r.text, r.scale));
    const wordW = widths.reduce((a, b) => a + b, 0);

    if (penX - wordW < leftEdge && penX !== rightEdge) {
      penX = rightEdge;
      line++;
    }

    // One shared baseline per line: enlarged letters grow upward from it.
    const maxScale = Math.max(...runs.map((r) => r.scale));
    const baseline = margin + line * lineHeight + ascent * enlargedScale;
    let runX = penX;
    const placed: PlacedRun[] = runs.map((r, i) => {
      const p = { ...r, xRight: runX };
      runX -= widths[i];
      return p;
    });

    const x = penX - wordW;
    const y = baseline - ascent * maxScale;
    const h = ascent * maxScale + descent;
    const padX = lineHeight * hitPadFactor;
    const padY = lineHeight * hitPadFactor;
    boxes.push({
      id: word.id,
      line,
      x, y, w: wordW, h,
      hit: { x: x - padX, y: y - padY, w: wordW + padX * 2, h: h + padY * 2 },
      runs: placed,
      baseline,
    });

    penX -= wordW + spaceW;
  }

  const lineCount = line + 1;
  const usedHeight = margin * 2 + lineCount * lineHeight;
  if (usedHeight > canvasHeight) {
    console.warn(`[layout] column overflow: ${usedHeight}px used of ${canvasHeight}px`);
  }

  return { boxes, lineCount, lineHeight };
}
