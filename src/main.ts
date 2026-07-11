import { TextureLoader, SRGBColorSpace, Vector3 } from 'three/webgpu';
import { AudioEngine } from './audio/engine';
import { KaraokePlayer } from './audio/karaoke';
import { ScrubPlayer } from './audio/scrub';
import { copy } from './content/copy';
import { paragraphWords, shema } from './content/shema';
import { ScrollPointer } from './interaction/pointer';
import { createLighting } from './scene/lighting';
import { createParchmentMaterial } from './scene/parchmentMaterial';
import { createSceneContext } from './scene/renderer';
import { createRollers } from './scene/rollers';
import { createScrollColumn, surfacePoint } from './scene/scroll';
import { Yad } from './scene/yad';
import { Machine } from './state/machine';
import { daysUntil, loadProgress, saveProgress } from './state/progress';
import { bakeColumn, type BakedWord } from './text/bake';
import { loadFonts } from './text/fonts';
import { WordIndex } from './text/wordIndex';
import { Screens } from './ui/screens';
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

  // --- Scroll column.
  const p1 = shema.paragraphs[0];
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

  const columnH = 1.4;
  const columnW = columnH * (baked.canvasWidth / baked.canvasHeight);
  const columnOpts = { width: columnW, height: columnH };
  const parchment = createParchmentMaterial(baked.texture, { albedo, normal, rough });
  const column = createScrollColumn(parchment.material, columnOpts);
  scene.add(column, createRollers(columnW, columnH));
  const lighting = createLighting(scene);

  const camDist = (columnH / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 1.06;
  camera.position.set(0, 0, camDist + 0.55); // start pulled back; dolly in on start
  let camTargetZ = camera.position.z;

  // --- Yad, strip, screens.
  const yad = new Yad();
  scene.add(yad.group);
  const ui = document.querySelector<HTMLDivElement>('#ui-root')!;
  const strip = new LearnerStrip(ui);
  const screens = new Screens(ui);

  // --- Audio.
  const engine = new AudioEngine();
  await engine.loadTrack('p1', 'audio/superjew-p1.mp3', 'timing/p1.json');
  const scrub = new ScrubPlayer(engine, 'p1');
  const karaoke = new KaraokePlayer(engine, 'p1');
  canvas.addEventListener('pointerdown', () => engine.unlock(), { once: true });

  // --- State.
  const machine = new Machine();
  const progress = loadProgress();
  const touched = new Set(progress.touchedWords);
  const versesDone = new Set(progress.versesCompleted);
  const shownFacts = new Set<string>();
  let lastTouchAt = performance.now();
  let ghostRunning = false;

  const persist = () => {
    progress.touchedWords = [...touched];
    progress.versesCompleted = [...versesDone];
    saveProgress(progress);
  };

  const wordAnchor = (w: BakedWord) => {
    const cu = (w.uvRect.u0 + w.uvRect.u1) / 2;
    return surfacePoint(cu, w.uvRect.v0, columnOpts);
  };
  const wordScreenPos = (w: BakedWord) => {
    const a = wordAnchor(w);
    const v = new Vector3(a.x, a.y, a.z).project(camera);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight };
  };

  const showWord = (w: BakedWord) => {
    parchment.highlight.show(w.uvRect);
    const word = words.find((x) => x.id === w.id);
    if (word) strip.show(word, wordAnchor(w));
  };

  const lampLevel = () => versesDone.size / p1.verses.length;

  // --- Verse completion checks.
  const verseComplete = (verseId: string) => {
    const verse = p1.verses.find((v) => v.id === verseId)!;
    return verse.words.every((w) => touched.has(w.id));
  };

  const onVerseDone = (verseId: string) => {
    versesDone.add(verseId);
    screens.lamp(lampLevel());
    persist();

    if (verseId === 'p1v4' && machine.is('tutorial')) {
      // Beat 2: the star moment.
      setTimeout(() => {
        screens.hint(null);
        const c = shema.meaningCardZero;
        machine.go({ name: 'meaning', card: c.id, next: { name: 'baruchShem' } });
        screens.meaningCard(c.title, c.body, 'Wait — one more thing', () => {
          machine.go({ name: 'baruchShem' });
          const bs = shema.asides[0];
          screens.baruchShem(bs.hePointed, bs.translit, bs.english, () => {
            machine.go({ name: 'trace', paragraph: 'p1' });
            screens.hint(copy.tutorial.hint2);
            setTimeout(() => screens.hint(null), 5000);
          });
        }, 'The most famous sentence in the Torah');
      }, 700);
      return;
    }

    if (versesDone.size === p1.verses.length && !progress.quizDone) {
      // Beat 4→5: paragraph done → meaning card → quiz.
      setTimeout(() => {
        const c = p1.meaningCard;
        screens.meaningCard(c.title, c.body, 'Show what you know', () => startQuiz(0), 'Paragraph one — done');
      }, 800);
    }
  };

  // --- Quiz.
  const startQuiz = (qi: number) => {
    machine.go({ name: 'quiz', index: qi });
    const item = copy.quiz.items[qi];
    const next = () => {
      parchment.highlight.hide();
      parchment.trail.hide();
      parchment.aux.hide();
      if (qi + 1 < copy.quiz.items.length) startQuiz(qi + 1);
      else {
        progress.quizDone = true;
        persist();
        celebrate();
      }
    };
    const playStem = () => {
      const slice = engine.wordSlice('p1', item.playWord);
      if (slice) engine.playSegment('p1', slice.start, slice.end);
    };

    if (item.kind === 'tap-word') {
      screens.quizTapPrompt(item.stem);
      const handles = [parchment.highlight, parchment.trail, parchment.aux];
      item.choices.forEach((id, i) => {
        const w = wordById.get(id);
        if (w) handles[i].show(w.uvRect);
      });
      playStem();
      const replay = setInterval(playStem, 2600);
      quizTapHandler = (id: string) => {
        if (!(item.choices as readonly string[]).includes(id)) return;
        if (id === item.playWord) {
          clearInterval(replay);
          quizTapHandler = null;
          screens.quizTapFeedback(item.right, true);
          setTimeout(() => {
            screens.dismissQuizTap();
            next();
          }, 1600);
        } else {
          screens.quizTapFeedback(item.wrong, false);
          playStem();
        }
      };
    } else {
      playStem();
      screens.quizChoice(
        item.stem,
        item.choices,
        (i) => (i === item.answer ? 'right' : (playStem(), 'wrong')),
        { right: item.right, wrong: item.wrong },
        next,
      );
    }
  };
  let quizTapHandler: ((id: string) => void) | null = null;

  // --- Celebration.
  const celebrate = () => {
    machine.go({ name: 'celebration' });
    progress.celebrated = true;
    persist();
    screens.lamp(1);
    const days = progress.bmitzvahDate ? daysUntil(progress.bmitzvahDate) : null;
    screens.celebration(
      days,
      () => machine.go({ name: 'explore' }),
      () => {
        machine.go({ name: 'explore' });
        const w = wordById.get('p1v4w1');
        if (w) parchment.aux.show(w.uvRect);
        screens.hint('Hand them the yad.');
        setTimeout(() => {
          screens.hint(null);
          parchment.aux.hide();
        }, 6000);
      },
    );
  };

  // --- Tutorial ghost demo: if nobody touches for 8s, the yad shows how.
  const ghostDemo = async () => {
    if (ghostRunning || !machine.is('tutorial')) return;
    ghostRunning = true;
    for (const id of ['p1v4w1', 'p1v4w2']) {
      const w = wordById.get(id);
      if (!w || !machine.is('tutorial')) break;
      const a = wordAnchor(w);
      yad.setTarget({ x: a.x, y: a.y + 0.01, z: a.z });
      showWord(w);
      const slice = engine.wordSlice('p1', id);
      if (slice) engine.playSegment('p1', slice.start, slice.end);
      await new Promise((r) => setTimeout(r, 1100));
    }
    parchment.highlight.hide();
    strip.hide();
    yad.hide();
    ghostRunning = false;
    lastTouchAt = performance.now();
  };

  // --- Interaction wiring.
  const interactive = () =>
    machine.is('tutorial') || machine.is('trace') || machine.is('explore') || machine.is('quiz');

  const index = new WordIndex(baked.words);
  const pointer = new ScrollPointer(canvas, camera, column, index);
  pointer
    .on('surfacemove', ({ point }) => {
      if (interactive() && !karaoke.playing) yad.setTarget(point);
    })
    .on('surfaceleave', () => {
      if (!karaoke.playing) {
        yad.hide();
        strip.hide();
      }
    })
    .on('wordenter', ({ word }) => {
      if (!interactive() || karaoke.playing) return;
      lastTouchAt = performance.now();
      screens.hideChip();

      if (machine.is('quiz')) {
        quizTapHandler?.(word.id);
        return;
      }

      scrub.wordEnter(word.id);
      showWord(word);

      const first = !touched.has(word.id);
      touched.add(word.id);

      if (machine.is('tutorial') && word.id === 'p1v4w1') {
        parchment.aux.hide(); // stop the come-touch-me pulse
        screens.hint(copy.tutorial.hint2 + '  ' + copy.tutorial.rtl);
      }

      if (first) {
        const verseId = word.id.replace(/w\d+$/, '');
        if (!versesDone.has(verseId) && verseComplete(verseId)) onVerseDone(verseId);
        else persist();

        const fact = p1.facts.find((f) => f.anchorWord === word.id);
        if (fact && !shownFacts.has(fact.id) && machine.is('trace')) {
          shownFacts.add(fact.id);
          const sp = wordScreenPos(word);
          screens.chip('Did you know?', fact.body, sp.x, sp.y);
        }
      }
    })
    .on('wordhold', ({ word }) => {
      if (interactive() && !machine.is('quiz') && !karaoke.playing) scrub.wordHold(word.id);
    })
    .on('wordleave', () => {
      if (machine.is('quiz') || karaoke.playing) return;
      scrub.wordLeave();
      parchment.highlight.hide();
    });

  // --- Karaoke wiring (play mode).
  karaoke.on('word', ({ id }) => {
    const w = wordById.get(id);
    if (!w) return;
    showWord(w);
    touched.add(id);
    const a = wordAnchor(w);
    yad.setTarget({ x: a.x, y: a.y + 0.01, z: a.z });
  });
  karaoke.on('ended', () => {
    parchment.highlight.hide();
    strip.hide();
    yad.hide();
    playBtn.textContent = '▶ Hear the whole thing';
    // Play mode counts: check verse completions it caused.
    for (const v of p1.verses) if (!versesDone.has(v.id) && verseComplete(v.id)) onVerseDone(v.id);
  });

  ui.insertAdjacentHTML(
    'beforeend',
    `<button id="play" style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    pointer-events:auto;background:rgba(212,160,23,0.92);border:0;border-radius:24px;
    padding:12px 28px;font:600 15px Rubik,system-ui;cursor:pointer;z-index:5;display:none">
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

  machine.onChange((s) => {
    playBtn.style.display = s.name === 'trace' || s.name === 'explore' ? '' : 'none';
  });

  // --- Landing (beat 0) → tutorial (beat 1).
  screens.lamp(lampLevel());
  screens.landing((date) => {
    if (date) progress.bmitzvahDate = date;
    persist();
    engine.unlock();
    camTargetZ = camDist; // dolly in
    if (progress.celebrated) {
      machine.go({ name: 'explore' });
      return;
    }
    machine.go({ name: 'tutorial' });
    const first = wordById.get('p1v4w1');
    if (first) parchment.aux.show(first.uvRect); // breathing come-touch-me pulse
    setTimeout(() => screens.hint(copy.tutorial.hint1), 1400);
  });

  if (import.meta.env.DEV) {
    Object.assign(window as object, {
      __shema: {
        wordScreenPos: (id: string) => {
          const w = wordById.get(id);
          return w ? wordScreenPos(w) : null;
        },
        wordIds: () => words.map((w) => w.id),
        state: () => machine.state,
      },
    });
  }

  // --- Render loop.
  let last = 0;
  renderer.setAnimationLoop((time: number) => {
    const t = time / 1000;
    const dt = Math.min(0.05, t - last || 0.016);
    last = t;
    lighting.update(t);
    camera.position.z += (camTargetZ - camera.position.z) * (1 - Math.exp(-dt * 2.2));
    yad.update(dt);
    parchment.highlight.update(dt);
    parchment.trail.update(dt);
    parchment.aux.update(dt);
    strip.update(camera);
    if (machine.is('tutorial') && performance.now() - lastTouchAt > 8000) void ghostDemo();
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
