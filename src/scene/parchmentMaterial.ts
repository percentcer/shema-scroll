import { MeshStandardNodeMaterial, RepeatWrapping, type Texture } from 'three/webgpu';
import {
  add,
  clamp,
  float,
  mix,
  mx_noise_float,
  smoothstep,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';

export interface HighlightHandle {
  /** Set the highlighted UV rect (u0, v0, u1, v1) and fade it in. */
  show(rect: { u0: number; v0: number; u1: number; v1: number }): void;
  /** Fade out. */
  hide(): void;
  /** Call each frame with delta seconds to tween strength. */
  update(dt: number): void;
  /** Change the glow color (default warm gold). */
  setColor(r: number, g: number, b: number): void;
}

const FEATHER = 0.006;
const ATTACK = 0.08;
const RELEASE = 0.3;

export interface ParchmentMaterialResult {
  material: MeshStandardNodeMaterial;
  highlight: HighlightHandle;
  /** Secondary rect used as the scrub trail (fades out on its own). */
  trail: HighlightHandle;
  /** Third rect for tutorial pulses / quiz choices. */
  aux: HighlightHandle;
}

/**
 * Parchment + ink compositing in TSL. The ink texture is baked
 * near-black-on-transparent; its alpha is the ink mask. Highlights are
 * uniform UV rects — 5 floats per change, no texture re-uploads.
 * Compiles to WGSL and GLSL alike (WebGL2 fallback included).
 */
export function createParchmentMaterial(
  inkTexture: Texture,
  pbr: { albedo: Texture; normal: Texture; rough: Texture },
): ParchmentMaterialResult {
  for (const t of [pbr.albedo, pbr.normal, pbr.rough]) {
    t.wrapS = t.wrapT = RepeatWrapping;
  }

  const material = new MeshStandardNodeMaterial();

  const ink = texture(inkTexture);

  // Weathering: darkened edges (handled parchment) + slow fbm blotches.
  const p = uv();
  const edgeFade = smoothstep(0.0, 0.16, p.x)
    .mul(smoothstep(1.0, 0.84, p.x))
    .mul(smoothstep(0.0, 0.1, p.y))
    .mul(smoothstep(1.0, 0.9, p.y));
  const vignette = mix(float(0.72), float(1.0), edgeFade);
  const blotch = mx_noise_float(p.mul(vec2(5, 3)))
    .mul(0.6)
    .add(mx_noise_float(p.mul(vec2(14, 9))).mul(0.4));
  const stain = vignette.mul(float(1.0).sub(blotch.mul(0.09)));
  const ageTint = mix(vec3(1.0, 0.9, 0.72), vec3(1.0, 0.96, 0.86), edgeFade); // browner edges
  const paper = texture(pbr.albedo).mul(ageTint).mul(stain);

  const makeRectUniforms = () => ({
    rect: uniform(vec4(0, 0, 0, 0)),
    strength: uniform(0),
    color: uniform(vec3(1.0, 0.78, 0.25)),
  });
  const h1 = makeRectUniforms();
  const h2 = makeRectUniforms();
  const h3 = makeRectUniforms();

  const rectGlow = (u: ReturnType<typeof makeRectUniforms>) => {
    const p = uv();
    const inside = smoothstep(u.rect.x.sub(FEATHER), u.rect.x.add(FEATHER), p.x)
      .mul(smoothstep(u.rect.z.add(FEATHER), u.rect.z.sub(FEATHER), p.x))
      .mul(smoothstep(u.rect.y.sub(FEATHER), u.rect.y.add(FEATHER), p.y))
      .mul(smoothstep(u.rect.w.add(FEATHER), u.rect.w.sub(FEATHER), p.y));
    const breathe = time.mul(3).sin().mul(0.15).add(0.85);
    return inside.mul(u.strength).mul(breathe);
  };

  const glow = add(add(rectGlow(h1), rectGlow(h2)), rectGlow(h3));
  const glowTint = add(
    add(h1.color.mul(rectGlow(h1)), h2.color.mul(rectGlow(h2))),
    h3.color.mul(rectGlow(h3)),
  );
  const inkMask = ink.a;

  const inked = mix(paper, ink.rgb, inkMask);
  // Ink glows bright under highlight; parchment tints faintly.
  const lit = inked.add(glowTint.mul(inkMask.mul(1.4).add(0.25)));
  material.colorNode = clamp(lit, 0, 2);

  material.normalMap = pbr.normal;
  // Ink is barely glossier than parchment — too much reads as faded ink
  // under specular at glancing angles.
  material.roughnessNode = clamp(
    texture(pbr.rough).r.mul(float(1).sub(inkMask.mul(0.12))).mul(float(1).sub(glow.mul(0.1))),
    0.55,
    1,
  );

  const makeHandle = (u: ReturnType<typeof makeRectUniforms>): HighlightHandle => {
    let target = 0;
    return {
      show(rect) {
        u.rect.value.set(rect.u0, rect.v0, rect.u1, rect.v1);
        target = 1;
      },
      hide() {
        target = 0;
      },
      update(dt) {
        const cur = u.strength.value as number;
        const rate = target > cur ? dt / ATTACK : dt / RELEASE;
        u.strength.value = cur + Math.sign(target - cur) * Math.min(rate, Math.abs(target - cur));
      },
      setColor(r, g, b) {
        u.color.value.set(r, g, b);
      },
    };
  };

  return { material, highlight: makeHandle(h1), trail: makeHandle(h2), aux: makeHandle(h3) };
}
