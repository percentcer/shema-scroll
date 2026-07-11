import {
  Color,
  HemisphereLight,
  Mesh,
  MeshStandardNodeMaterial,
  PlaneGeometry,
  PointLight,
} from 'three/webgpu';
import { createSceneContext } from './scene/renderer';

async function boot() {
  const canvas = document.querySelector<HTMLCanvasElement>('#app-canvas')!;
  const ctx = await createSceneContext(canvas);
  const { renderer, scene, camera } = ctx;

  console.info(`[shema-scroll] backend: ${ctx.isWebGPU ? 'WebGPU' : 'WebGL2 (fallback)'}`);

  // Stage-0 placeholder: a lit parchment-toned plane where the scroll will live.
  const plane = new Mesh(
    new PlaneGeometry(1.6, 1.0, 96, 48),
    new MeshStandardNodeMaterial({ color: new Color('#e8d8b0'), roughness: 0.85 }),
  );
  scene.add(plane);

  const candle = new PointLight('#ffb066', 12, 0, 2);
  candle.position.set(-0.8, 0.9, 1.1);
  scene.add(candle);
  scene.add(new HemisphereLight('#8899bb', '#221408', 0.35));

  const candleBase = candle.intensity;
  renderer.setAnimationLoop((time: number) => {
    const t = time / 1000;
    candle.intensity = candleBase * (1 + 0.06 * Math.sin(t * 7.3) + 0.04 * Math.sin(t * 13.1));
    renderer.render(scene, camera);
  });
}

boot().catch((err) => {
  console.error('[shema-scroll] failed to start', err);
  document.querySelector('#ui-root')!.innerHTML =
    `<div style="color:#e8d8b0;font-family:system-ui;padding:2rem;pointer-events:auto">
       Something went wrong starting the scroll. Try a recent Chrome, Edge, Firefox, or Safari.
     </div>`;
});
