import { HemisphereLight, PointLight } from 'three/webgpu';
import { paragraphWords } from './content/shema';
import { ScrollPointer } from './interaction/pointer';
import { createSceneContext } from './scene/renderer';
import { createScrollColumn } from './scene/scroll';
import { bakeColumn } from './text/bake';
import { loadFonts } from './text/fonts';
import { WordIndex } from './text/wordIndex';

async function boot() {
  const params0 = new URLSearchParams(location.search);
  if (params0.has('timing')) {
    await loadFonts();
    const { runTimingTool } = await import('./dev/timingTool');
    const seed = await fetch(`${import.meta.env.BASE_URL}timing/p1.json`)
      .then((r) => (r.ok ? r.json() : undefined))
      .catch(() => undefined);
    runTimingTool(
      paragraphWords('p1'),
      `${import.meta.env.BASE_URL}audio/superjew-p1.mp3`,
      'timing-p1',
      seed,
    );
    return;
  }

  const canvas = document.querySelector<HTMLCanvasElement>('#app-canvas')!;
  const [ctx] = await Promise.all([createSceneContext(canvas), loadFonts()]);
  const { renderer, scene, camera } = ctx;

  console.info(`[shema-scroll] backend: ${ctx.isWebGPU ? 'WebGPU' : 'WebGL2 (fallback)'}`);

  const params = new URLSearchParams(location.search);

  // Stage-2: full paragraph 1 baked as one scroll column.
  const baked = bakeColumn(paragraphWords('p1'), {
    width: 2048,
    height: 2048,
    fontPx: 130,
    background: '#e8d8b0',
    debugRects: params.has('debugRects'),
    maxAnisotropy: 8,
  });
  console.info(`[shema-scroll] baked ${baked.words.length} words, ${baked.layout.lineCount} lines`);

  const columnH = 1.4;
  const columnW = columnH * (baked.canvasWidth / baked.canvasHeight);
  const column = createScrollColumn(baked.texture, { width: columnW, height: columnH });
  scene.add(column);
  // Frame the whole column: visible height at distance d is 2·d·tan(fov/2).
  camera.position.set(0, 0, (columnH / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 1.06);

  const index = new WordIndex(baked.words);
  const pointer = new ScrollPointer(canvas, camera, column, index);
  pointer
    .on('wordenter', ({ word }) => console.info(`[pointer] enter ${word.id}`))
    .on('wordhold', ({ word }) => console.info(`[pointer] hold ${word.id}`));

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
