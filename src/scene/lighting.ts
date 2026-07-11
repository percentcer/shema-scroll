import {
  CanvasTexture,
  EquirectangularReflectionMapping,
  HemisphereLight,
  PointLight,
  SRGBColorSpace,
  type Scene,
} from 'three/webgpu';

export interface LightingRig {
  /** Call each frame with seconds for the candle flicker. */
  update(t: number): void;
}

/** Small hand-painted equirect environment: warm glow above-left, dark room below. */
function makeEnvTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#171009';
  g.fillRect(0, 0, 128, 64);
  // dim warm ceiling glow
  const glow = g.createRadialGradient(40, 14, 2, 40, 14, 46);
  glow.addColorStop(0, 'rgba(255, 176, 102, 0.9)');
  glow.addColorStop(1, 'rgba(255, 176, 102, 0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 128, 64);
  const t = new CanvasTexture(c);
  t.mapping = EquirectangularReflectionMapping;
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function createLighting(scene: Scene): LightingRig {
  // Reading-candle key light: warm, above-left, slightly frontal.
  const candle = new PointLight('#ffb066', 7, 0, 2);
  candle.position.set(-0.55, 0.65, 1.25);
  scene.add(candle);

  // Cool moonlight fill so shadows aren't dead black.
  scene.add(new HemisphereLight('#8899bb', '#221408', 0.4));

  // Environment for the yad's metal + subtle parchment sheen.
  scene.environment = makeEnvTexture();
  scene.environmentIntensity = 0.3;

  const base = candle.intensity;
  return {
    update(t: number) {
      candle.intensity = base * (1 + 0.06 * Math.sin(t * 7.3) + 0.04 * Math.sin(t * 13.1));
    },
  };
}
