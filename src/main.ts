import { TextureLoader, SRGBColorSpace } from 'three/webgpu';
import { AudioEngine } from './audio/engine';
import { KaraokePlayer } from './audio/karaoke';
import { ScrubPlayer } from './audio/scrub';
import { paragraphWords } from './content/shema';
import { ScrollPointer } from './interaction/pointer';
import { createLighting } from './scene/lighting';
import { createParchmentMaterial } from './scene/parchmentMaterial';
import { createSceneContext } from './scene/renderer';
import { createRollers } from './scene/rollers';
import { createScrollColumn, surfacePoint } from './scene/scroll';
import { Yad } from './scene/yad';
import { bakeColumn, type BakedWord } from './text/bake';
import { loadFonts } from './text/fonts';
import { WordIndex } from './text/wordIndex';
import { LearnerStrip } from './ui/strip';

const base = import.meta.env.BASE_URL;

async function loadTexture(loader: TextureLoader, url: string, srgb = false) {
  const t = await loader.loadAsync(base + url);
  if (srgb) t.colorSpace = SRGBColorSpace;
  return t;
}

async function boot() {
  const params = new URLSearchParams(location.search);
  if (params.has('timing')) {
    await loadFonts();
    const { runTimingTool } = await import('./dev/timingTool');
    const seed = await fetch(`${base}timing/p1.json`)
      .then((r) => (r.ok ? r.json() : undefined))
      .catch(() => undefined);
    runTimingTool(paragraphWords('p1'), `${base}audio/superjew-p1.mp3`, 'timing-p1', seed);
    return;
  }

  const canvas = document.querySelector<HTMLCanvasElement>('#app-canvas')!;
  const loader = new TextureLoader();
  const [ctx, , albedo, normal, rough] = await Promise.all([
    createSceneContext(canvas),
    loadFonts(),
    loadTexture(loader, 'textures/parchment_albedo.webp', true),
    loadTexture(loader, 'textures/parchment_normal.webp'),
    loadTexture(loader, 'textures/parchment_rough.webp'),
  ]);
  const { renderer, scene, camera } = ctx;

  console.info(`[shema-scroll] backend: ${ctx.isWebGPU ? 'WebGPU' : 'WebGL2 (fallback)'}`);

  // --- Scroll column: ink baked on transparent, composited in the shader.
  const words = paragraphWords('p1');
  const baked = bakeColumn(words, {
    width: 2048,
    height: 2048,
    fontPx: 130,
    background: null,
    debugRects: params.has('debugRects'),
    maxAnisotropy: 8,
  });
  const wordById = new Map<string, BakedWord>(baked.words.map((w) => [w.id, w]));
  console.info(`[shema-scroll] baked ${baked.words.length} words, ${baked.layout.lineCount} lines`);

  const columnH = 1.4;
  const columnW = columnH * (baked.canvasWidth / baked.canvasHeight);
  const columnOpts = { width: columnW, height: columnH };
  const parchment = createParchmentMaterial(baked.texture, { albedo, normal, rough });
  const column = createScrollColumn(parchment.material, columnOpts);
  scene.add(column);
  camera.position.set(0, 0, (columnH / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 1.06);

  // --- Yad + learner strip.
  const yad = new Yad();
  scene.add(yad.group);
  const ui = document.querySelector<HTMLDivElement>('#ui-root')!;
  const strip = new LearnerStrip(ui);

  // --- Audio.
  const engine = new AudioEngine();
  await engine.loadTrack('p1', 'audio/superjew-p1.mp3', 'timing/p1.json');
  const scrub = new ScrubPlayer(engine, 'p1');
  const karaoke = new KaraokePlayer(engine, 'p1');
  canvas.addEventListener('pointerdown', () => engine.unlock(), { once: true });

  const wordAnchor = (w: BakedWord) => {
    const cu = (w.uvRect.u0 + w.uvRect.u1) / 2;
    return surfacePoint(cu, w.uvRect.v0, columnOpts);
  };

  const showWord = (w: BakedWord) => {
    parchment.highlight.show(w.uvRect);
    const word = words.find((x) => x.id === w.id);
    if (word) strip.show(word, wordAnchor(w));
  };

  // --- Interaction: scrub with the yad (explore mode).
  const index = new WordIndex(baked.words);
  const pointer = new ScrollPointer(canvas, camera, column, index);
  pointer
    .on('surfacemove', ({ point }) => {
      if (!karaoke.playing) yad.setTarget(point);
    })
    .on('surfaceleave', () => {
      if (!karaoke.playing) {
        yad.hide();
        strip.hide();
      }
    })
    .on('wordenter', ({ word }) => {
      if (karaoke.playing) return;
      scrub.wordEnter(word.id);
      showWord(word);
    })
    .on('wordhold', ({ word }) => {
      if (!karaoke.playing) scrub.wordHold(word.id);
    })
    .on('wordleave', () => {
      if (karaoke.playing) return;
      scrub.wordLeave();
      parchment.highlight.hide();
    });

  // --- Karaoke: highlight + auto-following yad.
  karaoke.on('word', ({ id }) => {
    const w = wordById.get(id);
    if (!w) return;
    showWord(w);
    const a = wordAnchor(w);
    yad.setTarget({ x: a.x, y: a.y + 0.01, z: a.z });
  });
  karaoke.on('ended', () => {
    parchment.highlight.hide();
    strip.hide();
    yad.hide();
    playBtn.textContent = '▶ Hear the whole thing';
  });

  ui.insertAdjacentHTML(
    'beforeend',
    `<button id="play" style="position:fixed;bottom:24px;left:50%;
    transform:translateX(-50%);pointer-events:auto;background:#d4a017;border:0;
    border-radius:24px;padding:12px 28px;font:600 16px Rubik,system-ui;cursor:pointer">
    ▶ Hear the whole thing</button>`,
  );
  const playBtn = ui.querySelector<HTMLButtonElement>('#play')!;
  playBtn.addEventListener('click', async () => {
    await engine.unlock();
    if (karaoke.playing) {
      karaoke.stop();
      parchment.highlight.hide();
      strip.hide();
      yad.hide();
      playBtn.textContent = '▶ Hear the whole thing';
    } else {
      scrub.stop();
      karaoke.play();
      playBtn.textContent = '⏸ Pause';
    }
  });

  // --- Lights + rollers.
  const lighting = createLighting(scene);
  scene.add(createRollers(columnW, columnH));

  let last = 0;
  renderer.setAnimationLoop((time: number) => {
    const t = time / 1000;
    const dt = Math.min(0.05, t - last || 0.016);
    last = t;
    lighting.update(t);
    yad.update(dt);
    parchment.highlight.update(dt);
    parchment.trail.update(dt);
    strip.update(camera);
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
