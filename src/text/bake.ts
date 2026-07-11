import { CanvasTexture, SRGBColorSpace } from 'three/webgpu';
import type { ShemaWord } from '../content/types';
import { toScrollText } from '../content/types';
import { SCROLL_FONT } from './fonts';
import { layoutColumn, type ColumnLayout, type WordBox } from './layout';

export interface UVRect {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

export interface BakedWord extends WordBox {
  uvRect: UVRect;
  hitUvRect: UVRect;
}

export interface BakedColumn {
  texture: CanvasTexture;
  words: BakedWord[];
  layout: ColumnLayout;
  canvasWidth: number;
  canvasHeight: number;
}

export interface BakeOptions {
  width?: number;
  height?: number;
  fontPx?: number;
  inkColor?: string;
  /** Fill a parchment-ish background (spike mode). Off = ink-on-transparent for shader compositing. */
  background?: string | null;
  debugRects?: boolean;
  maxAnisotropy?: number;
}

const ENLARGED_SCALE = 1.6;

function pxToUv(r: { x: number; y: number; w: number; h: number }, cw: number, ch: number): UVRect {
  // Canvas y is down; UV v is up.
  return { u0: r.x / cw, v0: 1 - (r.y + r.h) / ch, u1: (r.x + r.w) / cw, v1: 1 - r.y / ch };
}

export function bakeColumn(words: ShemaWord[], opts: BakeOptions = {}): BakedColumn {
  const {
    width = 2048,
    height = 1024,
    fontPx = 150,
    inkColor = '#241505',
    background = null,
    debugRects = false,
    maxAnisotropy = 8,
  } = opts;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const fontFor = (scale: number) => `${Math.round(fontPx * scale)}px ${SCROLL_FONT}`;
  const measure = (text: string, scale: number) => {
    ctx.font = fontFor(scale);
    return ctx.measureText(text).width;
  };

  const layout = layoutColumn(
    words.map((w) => ({ id: w.id, text: toScrollText(w), enlarged: w.flags?.enlarged })),
    {
      canvasWidth: width,
      canvasHeight: height,
      fontPx,
      lineHeightFactor: 1.65,
      margin: Math.round(fontPx * 0.8),
      enlargedScale: ENLARGED_SCALE,
      measure,
    },
  );

  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.fillStyle = inkColor;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.direction = 'rtl';
  for (const box of layout.boxes) {
    for (const run of box.runs) {
      ctx.font = fontFor(run.scale);
      ctx.fillText(run.text, run.xRight, box.baseline);
    }
  }

  if (debugRects) {
    ctx.lineWidth = 3;
    for (const box of layout.boxes) {
      ctx.strokeStyle = 'rgba(200, 40, 40, 0.9)';
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.strokeStyle = 'rgba(40, 120, 200, 0.6)';
      ctx.strokeRect(box.hit.x, box.hit.y, box.hit.w, box.hit.h);
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.generateMipmaps = true;

  const baked: BakedWord[] = layout.boxes.map((box) => ({
    ...box,
    uvRect: pxToUv(box, width, height),
    hitUvRect: pxToUv(box.hit, width, height),
  }));

  return { texture, words: baked, layout, canvasWidth: width, canvasHeight: height };
}
