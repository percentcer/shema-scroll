import { MeshStandardNodeMaterial, RepeatWrapping, type Texture } from 'three/webgpu';
import {
  add,
  clamp,
  float,
  mix,
  smoothstep,
  texture,
  time,
  uniform,
  uv,
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
}

const FEATHER = 0.006;
const ATTACK = 0.08;
const RELEASE = 0.3;

export interface ParchmentMaterialResult {
  material: MeshStandardNodeMaterial;
  highlight: HighlightHandle;
  /** Secondary rect used as the scrub trail (fades out on its own). */
  trail: HighlightHandle;
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
  const paper = texture(pbr.albedo).mul(vec3(1.0, 0.94, 0.82)); // warm klaf tint

  const makeRectUniforms = () => ({
    rect: uniform(vec4(0, 0, 0, 0)),
    strength: uniform(0),
  });
  const h1 = makeRectUniforms();
  const h2 = makeRectUniforms();

  const rectGlow = (u: ReturnType<typeof makeRectUniforms>) => {
    const p = uv();
    const inside = smoothstep(u.rect.x.sub(FEATHER), u.rect.x.add(FEATHER), p.x)
      .mul(smoothstep(u.rect.z.add(FEATHER), u.rect.z.sub(FEATHER), p.x))
      .mul(smoothstep(u.rect.y.sub(FEATHER), u.rect.y.add(FEATHER), p.y))
      .mul(smoothstep(u.rect.w.add(FEATHER), u.rect.w.sub(FEATHER), p.y));
    const breathe = time.mul(3).sin().mul(0.15).add(0.85);
    return inside.mul(u.strength).mul(breathe);
  };

  const glowColor = vec3(1.0, 0.78, 0.25);
  const glow = add(rectGlow(h1), rectGlow(h2));
  const inkMask = ink.a;

  const inked = mix(paper, ink.rgb, inkMask);
  // Ink glows bright under highlight; parchment tints faintly.
  const lit = inked.add(glowColor.mul(glow).mul(inkMask.mul(1.4).add(0.25)));
  material.colorNode = clamp(lit, 0, 2);

  material.normalMap = pbr.normal;
  material.roughnessNode = texture(pbr.rough).r
    .mul(float(1).sub(inkMask.mul(0.35)))
    .mul(float(1).sub(glow.mul(0.15)));

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
    };
  };

  return { material, highlight: makeHandle(h1), trail: makeHandle(h2) };
}
