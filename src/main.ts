import { TextureLoader, SRGBColorSpace, Vector3, type Mesh } from 'three/webgpu';
import { AudioEngine } from './audio/engine';
import { KaraokePlayer } from './audio/karaoke';
import { ScrubPlayer } from './audio/scrub';
import { copy } from './content/copy';
import { paragraphWords, shema } from './content/shema';
import type { ShemaParagraph, ShemaWord } from './content/types';
import { ScrollPointer } from './interaction/pointer';
import { createLighting } from './scene/lighting';
import {
  createParchmentMaterial,
  type ParchmentMaterialResult,
} from './scene/parchmentMaterial';
import { createSceneContext } from './scene/renderer';
import { createRollers } from './scene/rollers';
import { createScrollColumn, surfacePoint, type ScrollColumnOptions } from './scene/scroll';
import { Yad } from './scene/yad';
import { Machine } from './state/machine';
import { daysUntil, loadProgress, saveProgress } from './state/progress';
import { bakeColumn, type BakedWord } from './text/bake';
import { loadFonts } from './text/fonts';
import { WordIndex } from './text/wordIndex';
import { Screens } from './ui/screens';
import { LearnerStrip } from './ui/strip';

const base = import.meta.env.BASE_URL;
type Pid = 'p1' | 'p2' | 'p3';

interface Column {
  pid: Pid;
  paragraph: ShemaParagraph;
  words: ShemaWord[];
  wordById: Map<string, BakedWord>;
  mesh: Mesh;
  parchment: ParchmentMaterialResult;
  index: WordIndex;
  scrub: ScrubPlayer;
  karaoke: KaraokePlayer;
  centerX: number;
  opts: ScrollColumnOptions;
}

async function loadTexture(loader: TextureLoader, url: string, srgb = false) {
  const t = await loader.loadAsync(base + url);
  if (srgb) t.colorSpace = SRGBColorSpace;
  return t;
}

async function boot() {
  const params = new URLSearchParams(location.search);
  if (params.has('timing')) {
    await loadFonts();
    const pid = (params.get('timing') === '1' ? 'p1' : params.get('timing')) as Pid;
    const track = shema.paragraphs.find((p) => p.id === pid)!.audioTrack;
    const { runTimingTool } = await import('./dev/timingTool');
    const seed = await fetch(`${base}timing/${pid}.json`)
      .then((r) => (r.ok ? r.json() : undefined))
      .catch(() => undefined);
    runTimingTool(paragraphWords(pid), base + track, `timing-${pid}`, seed);
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

  // --- Audio: start all loads now, but only p1 gates the start button —
  // p2/p3 finish downloading behind the landing screen and first session.
  const engine = new AudioEngine();
  const trackLoads = new Map(
    shema.paragraphs.map((p) => [
      p.id,
      engine.loadTrack(p.id, p.audioTrack, `timing/${p.id}.json`),
    ]),
  );
  await trackLoads.get('p1');
  canvas.addEventListener('pointerdown', () => engine.unlock(), { once: true });

  // --- Three columns, laid out right-to-left (Torah order): p1 right, p3 left.
  // Bake ladder: smaller canvases on coarse-pointer/small/low-memory devices.
  const isCoarse = matchMedia('(pointer: coarse)').matches;
  const lowMem = (navigator as { deviceMemory?: number }).deviceMemory ?? 8;
  const bakeSize = isCoarse || lowMem <= 4 || Math.min(innerWidth, innerHeight) < 500 ? 1600 : 2048;
  const columnH = 1.4;
  const columnW = columnH; // square canvases
  const gap = 0.06;
  const spreadW = columnW * 3 + gap * 2;
  const centerXFor = (i: number) => (1 - i) * (columnW + gap); // p1 → +, p2 → 0, p3 → −

  const columns: Column[] = shema.paragraphs.map((paragraph, i) => {
    const words = paragraph.verses.flatMap((v) => v.words);
    const baked = bakeColumn(words, {
      width: bakeSize,
      height: bakeSize,
      fontPx: Math.round(bakeSize * 0.0635),
      background: null,
      debugRects: params.has('debugRects'),
      maxAnisotropy: 8,
    });
    const centerX = centerXFor(i);
    // Column i's slice of the spread, in spread-u (left→right).
    const su0 = ((2 - i) * (columnW + gap)) / spreadW;
    const su1 = su0 + columnW / spreadW;
    const opts: ScrollColumnOptions = {
      width: columnW,
      height: columnH,
      spread: { u0: su0, u1: su1 },
    };
    const parchment = createParchmentMaterial(baked.texture, { albedo, normal, rough });
    const mesh = createScrollColumn(parchment.material, opts);
    mesh.position.x = centerX;
    scene.add(mesh);
    return {
      pid: paragraph.id,
      paragraph,
      words,
      wordById: new Map(baked.words.map((w) => [w.id, w])),
      mesh,
      parchment,
      index: new WordIndex(baked.words),
      scrub: new ScrubPlayer(engine, paragraph.id),
      karaoke: new KaraokePlayer(engine, paragraph.id),
      centerX,
      opts,
    };
  });
  const byPid = new Map(columns.map((c) => [c.pid, c]));
  scene.add(createRollers(spreadW, columnH));
  const lighting = createLighting(scene);

  // --- Camera: overview at landing, per-column poses afterwards.
  // Distance must fit BOTH height and width (portrait phones are width-bound).
  const tanHalfFov = () => Math.tan((camera.fov * Math.PI) / 360);
  const fitDist = (w: number, h: number) =>
    Math.max(h / 2 / tanHalfFov(), w / 2 / (tanHalfFov() * camera.aspect)) * 1.08 + 0.06;
  const camTarget = new Vector3();
  let focused: Pid | 'overview' = 'overview';
  const applyFocus = () => {
    if (focused === 'overview') camTarget.set(0, 0, fitDist(spreadW, columnH) * 0.92);
    else camTarget.set(byPid.get(focused)!.centerX, 0, fitDist(columnW, columnH));
  };
  const focusColumn = (pid: Pid | 'overview') => {
    focused = pid;
    applyFocus();
  };
  applyFocus();
  camera.position.copy(camTarget);
  addEventListener('resize', applyFocus);

  // --- Yad, strip, screens.
  const yad = new Yad();
  scene.add(yad.group);
  const ui = document.querySelector<HTMLDivElement>('#ui-root')!;
  const strip = new LearnerStrip(ui);
  const screens = new Screens(ui);

  // --- State.
  const machine = new Machine();
  const progress = loadProgress();
  const touched = new Set(progress.touchedWords);
  const versesDone = new Set(progress.versesCompleted);
  const paragraphsDone = new Set(progress.paragraphsCompleted);
  const shownFacts = new Set<string>();
  const totalVerses = shema.paragraphs.reduce((a, p) => a + p.verses.length, 0);
  let lastTouchAt = performance.now();
  let ghostRunning = false;
  let followResumeFrom: string | null = null;
  let quizTapHandler: ((id: string) => void) | null = null;

  const persist = () => {
    progress.touchedWords = [...touched];
    progress.versesCompleted = [...versesDone];
    progress.paragraphsCompleted = [...paragraphsDone];
    saveProgress(progress);
  };

  const wordAnchor = (col: Column, w: BakedWord) => {
    const cu = (w.uvRect.u0 + w.uvRect.u1) / 2;
    const p = surfacePoint(cu, w.uvRect.v0, col.opts);
    return { x: p.x + col.centerX, y: p.y, z: p.z };
  };
  const wordScreenPos = (col: Column, w: BakedWord) => {
    // Center of the ink rect — robust for hit-targeting (the strip anchors
    // at the bottom edge instead; see wordAnchor).
    const cu = (w.uvRect.u0 + w.uvRect.u1) / 2;
    const cv = (w.uvRect.v0 + w.uvRect.v1) / 2;
    const p = surfacePoint(cu, cv, col.opts);
    const v = new Vector3(p.x + col.centerX, p.y, p.z).project(camera);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight };
  };
  const showWord = (col: Column, w: BakedWord) => {
    col.parchment.highlight.show(w.uvRect);
    const word = col.words.find((x) => x.id === w.id);
    if (word) strip.show(word, wordAnchor(col, w));
  };
  const hideAllGlow = () => {
    for (const c of columns) {
      c.parchment.highlight.hide();
      c.parchment.trail.hide();
      c.parchment.aux.hide();
    }
  };
  const stopAllAudio = () => {
    for (const c of columns) {
      c.scrub.stop();
      c.karaoke.stop();
    }
  };
  const lampLevel = () => versesDone.size / totalVerses;

  // --- Paragraph flow.
  const verseComplete = (col: Column, verseId: string) => {
    const verse = col.paragraph.verses.find((v) => v.id === verseId)!;
    return verse.words.every((w) => touched.has(w.id));
  };
  const paragraphComplete = (col: Column) =>
    col.paragraph.verses.every((v) => versesDone.has(v.id));

  const enterParagraph = (pid: Pid) => {
    hideAllGlow();
    strip.hide();
    focusColumn(pid);
    const col = byPid.get(pid)!;
    if (pid === 'p2') {
      // Beat 4a — FOLLOW: the yad glides itself; grab anytime to take over.
      machine.go({ name: 'follow', paragraph: 'p2' });
      screens.hint('This one’s long — so just listen. The yad knows the way. Grab it anytime.');
      setTimeout(async () => {
        screens.hint(null);
        await trackLoads.get('p2'); // in case a slow connection is still downloading
        if (machine.is('follow')) col.karaoke.play();
      }, 2600);
    } else if (pid === 'p3') {
      // Beat 4b — LEAD: the kid drives the finale.
      machine.go({ name: 'lead', paragraph: 'p3' });
      screens.hint('Last one. You lead — the scroll will keep up with you.');
      setTimeout(() => screens.hint(null), 4200);
    }
  };

  const onParagraphDone = (col: Column) => {
    if (paragraphsDone.has(col.pid)) return;
    paragraphsDone.add(col.pid);
    persist();
    stopAllAudio();
    const c = col.paragraph.meaningCard;
    const kickers: Record<Pid, string> = {
      p1: 'Paragraph one — done',
      p2: 'Paragraph two — the long one, done',
      p3: 'That was the whole Shema',
    };
    const ctas: Record<Pid, string> = {
      p1: 'On to the next column',
      p2: 'One paragraph left',
      p3: 'Show what you know',
    };
    setTimeout(() => {
      machine.go({ name: 'meaning', card: c.id, next: { name: 'landing' } });
      screens.meaningCard(c.title, c.body, ctas[col.pid], () => {
        if (col.pid === 'p1') {
          screens.hint(copy.session.handOff);
          setTimeout(() => screens.hint(null), 3800);
          enterParagraph('p2');
        } else if (col.pid === 'p2') enterParagraph('p3');
        else startQuiz(0);
      }, kickers[col.pid]);
    }, 800);
  };

  const onVerseDone = (col: Column, verseId: string) => {
    versesDone.add(verseId);
    screens.lamp(lampLevel());
    persist();

    if (verseId === 'p1v4' && machine.is('tutorial')) {
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

    if (paragraphComplete(col)) onParagraphDone(col);
  };

  // --- Quiz (all three questions use p1 words).
  const startQuiz = (qi: number) => {
    machine.go({ name: 'quiz', index: qi });
    focusColumn('p1');
    const p1col = byPid.get('p1')!;
    const item = copy.quiz.items[qi];
    const next = () => {
      hideAllGlow();
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
      const handles = [p1col.parchment.highlight, p1col.parchment.trail, p1col.parchment.aux];
      item.choices.forEach((id, i) => {
        const w = p1col.wordById.get(id);
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

  // --- Celebration.
  const celebrate = () => {
    machine.go({ name: 'celebration' });
    progress.celebrated = true;
    persist();
    screens.lamp(1);
    focusColumn('overview'); // pull back: the whole scroll, yours
    const days = progress.bmitzvahDate ? daysUntil(progress.bmitzvahDate) : null;
    screens.celebration(
      days,
      () => machine.go({ name: 'explore' }),
      () => {
        machine.go({ name: 'explore' });
        focusColumn('p1');
        const w = byPid.get('p1')!.wordById.get('p1v4w1');
        if (w) byPid.get('p1')!.parchment.aux.show(w.uvRect);
        screens.hint('Hand them the yad.');
        setTimeout(() => {
          screens.hint(null);
          byPid.get('p1')!.parchment.aux.hide();
        }, 6000);
      },
    );
  };

  // --- Tutorial ghost demo.
  const ghostDemo = async () => {
    if (ghostRunning || !machine.is('tutorial')) return;
    ghostRunning = true;
    const col = byPid.get('p1')!;
    for (const id of ['p1v4w1', 'p1v4w2']) {
      const w = col.wordById.get(id);
      if (!w || !machine.is('tutorial')) break;
      const a = wordAnchor(col, w);
      yad.setTarget({ x: a.x, y: a.y + 0.01, z: a.z });
      showWord(col, w);
      const slice = engine.wordSlice('p1', id);
      if (slice) engine.playSegment('p1', slice.start, slice.end);
      await new Promise((r) => setTimeout(r, 1100));
    }
    col.parchment.highlight.hide();
    strip.hide();
    yad.hide();
    ghostRunning = false;
    lastTouchAt = performance.now();
  };

  // --- Interaction.
  const interactive = () =>
    ['tutorial', 'trace', 'follow', 'lead', 'explore', 'quiz'].includes(machine.state.name);
  const anyKaraokePlaying = () => columns.some((c) => c.karaoke.playing);
  /** Which column the current state allows touching (null = all, in explore). */
  const activeSessionPid = (): Pid | null => {
    const s = machine.state;
    if (s.name === 'explore') return null;
    if (s.name === 'quiz' || s.name === 'tutorial') return 'p1';
    return 'paragraph' in s ? s.paragraph : 'p1';
  };
  let followGrabbed = false;
  const resumeFollow = () => {
    const col = byPid.get('p2')!;
    followGrabbed = false;
    col.scrub.stop();
    col.parchment.highlight.hide();
    col.karaoke.play(followResumeFrom ?? undefined);
    followResumeFrom = null;
  };

  const pointer = new ScrollPointer(
    canvas,
    camera,
    columns.map((c) => ({ mesh: c.mesh, index: c.index, pid: c.pid })),
  );

  pointer
    .on('surfacemove', ({ point, pid }) => {
      if (!interactive()) return;
      const active = activeSessionPid();
      if (active && pid !== active) {
        // Wandered onto an inactive column: in follow mode that releases the yad.
        if (machine.is('follow') && followGrabbed) resumeFollow();
        return;
      }
      // In follow mode, touching the surface takes the yad back from autoplay.
      if (machine.is('follow') && pid === 'p2' && anyKaraokePlaying()) {
        const col = byPid.get('p2')!;
        followResumeFrom = col.karaoke.currentWordId;
        followGrabbed = true;
        col.karaoke.stop();
      }
      if (!anyKaraokePlaying()) yad.setTarget(point);
    })
    .on('surfaceleave', () => {
      if (machine.is('follow') && followGrabbed && !anyKaraokePlaying()) {
        // Released the yad: autoplay resumes where the kid left off.
        resumeFollow();
        return;
      }
      if (!anyKaraokePlaying()) {
        yad.hide();
        strip.hide();
      }
    })
    .on('wordenter', ({ word, pid }) => {
      if (!interactive() || anyKaraokePlaying()) return;
      const active = activeSessionPid();
      if (active && pid !== active) return;
      lastTouchAt = performance.now();
      screens.hideChip();
      const col = byPid.get(pid as Pid)!;

      if (machine.is('quiz')) {
        quizTapHandler?.(word.id);
        return;
      }

      col.scrub.wordEnter(word.id);
      showWord(col, word);

      const first = !touched.has(word.id);
      touched.add(word.id);

      if (machine.is('tutorial') && word.id === 'p1v4w1') {
        col.parchment.aux.hide();
        screens.hint(copy.tutorial.hint2 + '  ' + copy.tutorial.rtl);
      }

      // The tekhelet moment: the sky-blue thread glows blue.
      if (word.id === 'p3v38w19' && first) {
        col.parchment.aux.setColor(0.35, 0.62, 1.0);
        col.parchment.aux.show(word.uvRect);
        setTimeout(() => col.parchment.aux.hide(), 2800);
      }

      if (first) {
        const verseId = word.id.replace(/w\d+$/, '');
        if (!versesDone.has(verseId) && verseComplete(col, verseId)) onVerseDone(col, verseId);
        else persist();

        const fact = col.paragraph.facts.find((f) => f.anchorWord === word.id);
        const inSession = ['trace', 'follow', 'lead'].includes(machine.state.name);
        if (fact && !shownFacts.has(fact.id) && inSession) {
          shownFacts.add(fact.id);
          const sp = wordScreenPos(col, word);
          screens.chip('Did you know?', fact.body, sp.x, sp.y);
        }
      }
    })
    .on('wordhold', ({ word, pid }) => {
      const active = activeSessionPid();
      if (active && pid !== active) return;
      if (interactive() && !machine.is('quiz') && !anyKaraokePlaying())
        byPid.get(pid as Pid)!.scrub.wordHold(word.id);
    })
    .on('wordleave', ({ pid }) => {
      if (machine.is('quiz') || anyKaraokePlaying()) return;
      const col = byPid.get(pid as Pid)!;
      col.scrub.wordLeave();
      col.parchment.highlight.hide();
    });

  // --- Karaoke wiring per column.
  for (const col of columns) {
    col.karaoke.on('word', ({ id }) => {
      const w = col.wordById.get(id);
      if (!w) return;
      showWord(col, w);
      touched.add(id);
      const a = wordAnchor(col, w);
      yad.setTarget({ x: a.x, y: a.y + 0.01, z: a.z });
    });
    col.karaoke.on('ended', () => {
      col.parchment.highlight.hide();
      strip.hide();
      yad.hide();
      playBtn.textContent = '▶ Hear this column';
      for (const v of col.paragraph.verses)
        if (!versesDone.has(v.id) && verseComplete(col, v.id)) onVerseDone(col, v.id);
      // Follow mode completes by listening even if a few words were skipped.
      if (machine.is('follow') && col.pid === 'p2') {
        for (const v of col.paragraph.verses) versesDone.add(v.id);
        col.words.forEach((w) => touched.add(w.id));
        screens.lamp(lampLevel());
        onParagraphDone(col);
      }
    });
  }

  ui.insertAdjacentHTML(
    'beforeend',
    `<button id="play" style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    pointer-events:auto;background:rgba(212,160,23,0.92);border:0;border-radius:24px;
    padding:12px 28px;font:600 15px Rubik,system-ui;cursor:pointer;z-index:5;display:none">
    ▶ Hear this column</button>`,
  );
  const playBtn = ui.querySelector<HTMLButtonElement>('#play')!;
  const activePid = (): Pid => {
    const s = machine.state;
    return 'paragraph' in s ? s.paragraph : 'p1';
  };
  playBtn.addEventListener('click', async () => {
    await engine.unlock();
    const col = byPid.get(activePid())!;
    if (anyKaraokePlaying()) {
      stopAllAudio();
      hideAllGlow();
      strip.hide();
      yad.hide();
      playBtn.textContent = '▶ Hear this column';
    } else {
      col.scrub.stop();
      col.karaoke.play();
      playBtn.textContent = '⏸ Pause';
    }
  });
  machine.onChange((s) => {
    playBtn.style.display = ['trace', 'lead', 'explore'].includes(s.name) ? '' : 'none';
  });

  // --- Landing → tutorial.
  screens.lamp(lampLevel());
  screens.landing((date) => {
    if (date) progress.bmitzvahDate = date;
    persist();
    engine.unlock();
    if (progress.celebrated) {
      machine.go({ name: 'explore' });
      focusColumn('p1');
      return;
    }
    machine.go({ name: 'tutorial' });
    focusColumn('p1');
    const first = byPid.get('p1')!.wordById.get('p1v4w1');
    if (first) byPid.get('p1')!.parchment.aux.show(first.uvRect);
    setTimeout(() => screens.hint(copy.tutorial.hint1), 1600);
  });

  if (import.meta.env.DEV) {
    Object.assign(window as object, {
      __shema: {
        wordScreenPos: (id: string) => {
          const col = columns.find((c) => c.wordById.has(id));
          const w = col?.wordById.get(id);
          return col && w ? wordScreenPos(col, w) : null;
        },
        wordIds: () => columns.flatMap((c) => c.words.map((w) => w.id)),
        state: () => machine.state,
        touched: () => [...touched],
        camSettled: () => camera.position.distanceTo(camTarget) < 0.01,
      },
    });
  }

  // --- Render loop.
  let last = 0;
  let last0 = 0;
  renderer.setAnimationLoop((time: number) => {
    const t = time / 1000;
    const dt = Math.min(0.05, t - last || 0.016);
    last = t;
    lighting.update(t);
    // Real elapsed time (not the physics-capped dt) so low headless frame
    // rates still converge on schedule.
    camera.position.lerp(camTarget, 1 - Math.exp(-(t - last0) * 2.8));
    last0 = t;
    yad.update(dt);
    for (const c of columns) {
      c.parchment.highlight.update(dt);
      c.parchment.trail.update(dt);
      c.parchment.aux.update(dt);
    }
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
