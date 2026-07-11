import { Mesh, PlaneGeometry, type Material } from 'three/webgpu';

export interface ScrollColumnOptions {
  width: number;
  height: number;
  /** Max curl depth (scene units) toward the rollers at the side edges. */
  curlAmp?: number;
  /** Parchment waviness amplitude as a fraction of width. */
  noiseAmp?: number;
  /**
   * This column's span within the whole unrolled spread, as [u0, u1] in
   * spread space. Curl + waviness are computed in spread space so adjacent
   * columns form one continuous sheet. Defaults to the full spread.
   */
  spread?: { u0: number; u1: number };
}

/** Deterministic 2D value noise (two octaves) for parchment waviness. */
function noise2(x: number, y: number): number {
  const h = (n: number) => {
    const s = Math.sin(n) * 43758.5453123;
    return s - Math.floor(s);
  };
  const lerp = (a: number, b: number, t: number) => a + (b - a) * (t * t * (3 - 2 * t));
  const cell = (xi: number, yi: number) => h(xi * 127.1 + yi * 311.7);
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  return lerp(
    lerp(cell(xi, yi), cell(xi + 1, yi), xf),
    lerp(cell(xi, yi + 1), cell(xi + 1, yi + 1), xf),
    yf,
  );
}

/**
 * Height of the parchment surface at a given UV — the single source of truth
 * shared by the baked vertex displacement and (later) the yad auto-follow.
 */
export function surfaceZ(u: number, v: number, opts: ScrollColumnOptions): number {
  const { width, curlAmp = 0.06, noiseAmp = 0.005, spread } = opts;
  const gu = spread ? spread.u0 + u * (spread.u1 - spread.u0) : u;
  // Gentle curl toward both side edges of the SPREAD (where the rollers live).
  const edge = Math.pow(Math.abs(gu - 0.5) * 2, 3);
  const curl = -curlAmp * edge;
  const wave =
    noiseAmp * width * (noise2(gu * 6, v * 3) * 0.7 + noise2(gu * 14, v * 7) * 0.3 - 0.5);
  return curl + wave;
}

/** World-space point on the (origin-centered) column surface for a UV. */
export function surfacePoint(
  u: number,
  v: number,
  opts: ScrollColumnOptions,
): { x: number; y: number; z: number } {
  return {
    x: (u - 0.5) * opts.width,
    y: (v - 0.5) * opts.height,
    z: surfaceZ(u, v, opts),
  };
}

/**
 * A scroll column: plane with curl + waviness baked into CPU vertex positions
 * so raycasting hits the true surface. UVs are untouched.
 */
export function createScrollColumn(material: Material, opts: ScrollColumnOptions): Mesh {
  const { width, height } = opts;
  const geometry = new PlaneGeometry(width, height, 96, 48);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, surfaceZ(uv.getX(i), uv.getY(i), opts));
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();

  return new Mesh(geometry, material);
}
