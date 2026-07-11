import {
  HemisphereLight,
  Mesh,
  MeshStandardNodeMaterial,
  PlaneGeometry,
  PointLight,
} from 'three/webgpu';
import { shema } from './content/shema';
import { createSceneContext } from './scene/renderer';
import { bakeColumn } from './text/bake';
import { loadFonts } from './text/fonts';

async function boot() {
  const canvas = document.querySelector<HTMLCanvasElement>('#app-canvas')!;
  const [ctx] = await Promise.all([createSceneContext(canvas), loadFonts()]);
  const { renderer, scene, camera } = ctx;

  console.info(`[shema-scroll] backend: ${ctx.isWebGPU ? 'WebGPU' : 'WebGL2 (fallback)'}`);

  const params = new URLSearchParams(location.search);

  // Stage-1 spike: bake Deut 6:4 in STaM script onto the plane.
  const baked = bakeColumn(shema.paragraphs[0].verses[0].words, {
    background: '#e8d8b0',
    debugRects: params.has('debugRects'),
  });
  console.info(
    `[shema-scroll] baked ${baked.words.length} words, ${baked.layout.lineCount} lines`,
    baked.words.map((w) => `${w.id}@${Math.round(w.x)},${Math.round(w.y)}`).join(' '),
  );

  const aspect = baked.canvasWidth / baked.canvasHeight;
  const planeH = 1.0;
  const plane = new Mesh(
    new PlaneGeometry(planeH * aspect, planeH, 96, 48),
    new MeshStandardNodeMaterial({ map: baked.texture, roughness: 0.85 }),
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
