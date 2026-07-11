# CLAUDE.md — The Living Scroll (B'Mitzvah Confidence Coach)

## Project summary

Proof-of-concept for the Common Era vibe-coding sprint (PRD: `docs/prd.txt`,
weekend of 2026-07-10). Instead of the PRD's implied card-stack lesson app, this
is an **immersive 3D Torah scroll**: the cursor becomes a yad (Torah pointer),
and dragging it across the parchment plays a real cantorial recording word-by-
word under your hand, with transliteration + plain-English meaning following.
Full three-paragraph Shema (Deut 6:4–9, Deut 11:13–21, Num 15:37–41).

- **Live**: https://percentcer.github.io/shema-scroll/
- **Repo**: `percentcer/shema-scroll` (GitHub Pages deploys via Actions on every push to `main`)
- **Stack**: Vanilla TypeScript + Vite, three.js `0.185.1` (pinned) `WebGPURenderer`
  with automatic WebGL2 fallback, TSL node materials, Web Audio API. No framework,
  no backend, static deploy.
- **Plan**: `~/.claude/plans/hi-claude-i-m-doing-jiggly-pebble.md` (full design doc)

## Experience arc (all implemented)

Landing ("Let's open the scroll", optional B'Mitzvah date → countdown; parent modal) →
camera dollies to column 1 → tutorial (pulsing שמע, "touch it", RTL hint, 8s-idle
ghost demo where the yad demonstrates itself) → trace verse 1 → Meaning Card #0 →
**Baruch Shem whisper moment** (glowing air-text *beside* the scroll — it's liturgy,
not Torah, so it never renders on parchment) → trace V'ahavta (fact chips, confidence
lamp) → **p2 follow mode** (yad auto-glides karaoke-style; touching the parchment
grabs it, releasing resumes autoplay where you left off) → **p3 lead mode** (kid
drives; tekhelet word glows sky-blue) → meaning cards between each → 3-question
quiz (q1 taps glowing words on the actual scroll; q2/q3 warm multiple-choice, wrong
answers replay audio and retry — can't fail) → celebration ✓ + countdown → free
explore. Progress persists in localStorage (`bmc.progress.v1`).

## Chronology (git log tells the story, oldest first)

| Commit | Stage | What happened |
|---|---|---|
| `cc2b5e5` | 0 | Vite+TS scaffold, WebGPURenderer boot, `?forceWebGL=1` flag, headless screenshot tool. Installed Node 22 to `~/.local/opt` (SteamOS read-only root). |
| `08e2b2b` | 0 | GitHub Pages deploy workflow (`BASE_PATH` from repo name). |
| `b2b287b` | 1 | Assets: fonts (Stam Ashkenaz CLM, Taamey Frank CLM, Rubik), audio (Wikimedia Commons CC recordings → mono MP3), ambientCG Paper005 PBR → webp, Sefaria raw JSON archived. **STaM bake spike killed risk R1** — canvas-baked sofer script with exact word boxes, enlarged ע/ד via split glyph runs, shared per-line baseline. |
| `b7c6a03` | 2 | Corpus generator (Sefaria JSON → word tokens; Hebrew verified byte-identical — hand-typed Hebrew differed in combining-mark order!). Full P1 content. WordIndex (uv→word), curl-displaced scroll mesh, pointer raycasting. 7 layout unit tests. |
| `5146403` | 3 | `?timing=` authoring tool + **auto-generated rough timing maps** (ffmpeg silencedetect segments + syllable-proportional distribution, snapped to verse boundaries). Loudness analysis proved the recording has no Baruch Shem interpolation. |
| `2eebed0` | 4 | Audio core: `playSegment` with gain-envelope crossfades; scrub = crossfaded word-segment triggering (~90ms throttle, hold = practice loop); karaoke = binary-search word tracking. **Saturday gate passed.** |
| `db43c90` | 5 | Yad (primitive-composed, tip-anchored spring follow, velocity lean, contact shadow, `cursor: none`); TSL uniform UV-rect highlights (zero texture re-uploads); learner strip. |
| `ca0a619` | 6 | Materiality: TSL procedural stains/edge-aging, ink gloss fix, rollers (atzei chayim), candle rig + equirect env, CSS vignette. |
| `76c071a` | 7 | Full experience arc + copy + FSM + screens + quiz + celebration. Automated playthrough passes. |
| `5078801` | 8 | P2+P3 via annotation-driven generator; three columns, spread-continuous curl; follow/lead modes; grab-and-release; per-handle glow color; camera pans; interaction restricted to active column. |
| `2cdc559` | 9 | Subset woff2 fonts (~100KB), lazy audio (p1 gates start; p2/p3 load behind landing), bake ladder (1600px mobile / 2048px desktop), **aspect-aware camera framing** (portrait phones were width-clipped). |

Then: repo created, pushed, Pages enabled, live URL smoke-tested.

## Architecture map

```
src/main.ts                 # orchestration: columns, state flow, quiz, celebration (the big file)
src/content/types.ts        # word-ID contract (p1v4w3 = paragraph.verse.word) — NEVER renumber
src/content/shema.ts        # p1 corpus inline + imports p2/p3; meaningCardZero; Baruch Shem aside
src/content/p2.ts, p3.ts    # GENERATED — do not hand-edit Hebrew (see Content pipeline)
src/content/copy.ts         # all UI copy incl. quiz items + credits
src/state/machine.ts        # tiny FSM: landing/tutorial/meaning/baruchShem/trace/follow/lead/quiz/celebration/explore
src/state/progress.ts       # localStorage
src/text/layout.ts          # pure RTL word layout (unit-tested); splitRuns for enlarged letters
src/text/bake.ts            # canvas → CanvasTexture, auto-fit font shrink, WordBox uv/hit rects
src/text/wordIndex.ts       # uv → word (line binary search)
src/scene/renderer.ts       # WebGPURenderer init, isWebGPU detection, pixel-ratio policy
src/scene/scroll.ts         # CPU curl+noise displacement (raycaster needs real vertices); surfacePoint(uv)
src/scene/parchmentMaterial.ts  # TSL: ink-alpha compositing over PBR, stains, 3 highlight handles (rect+strength+color uniforms)
src/scene/yad.ts, rollers.ts, lighting.ts
src/audio/engine.ts         # decoded-buffer segment player, crossfade envelopes
src/audio/scrub.ts          # wordEnter→crossfaded slice, throttled; hold loop
src/audio/karaoke.ts        # continuous play + RAF word tracking (reads timing lazily — tracks load async)
src/interaction/pointer.ts  # raycast across all 3 column meshes → wordenter/leave/hold + pid
src/ui/screens.ts           # landing/cards/BaruchShem/quiz/celebration/lamp/chips/credits
src/ui/strip.ts             # learner strip projected from word anchor
src/dev/timingTool.ts       # ?timing=p1|p2|p3 boundary-tapping tool
```

### Key technical decisions (and why)

- **Canvas-baked text** (not MSDF/troika): browser shapes the Hebrew perfectly;
  we lay out every word by hand RTL so hit rects are exact. troika is broken
  under WebGPURenderer (`onBeforeCompile` never runs).
- **Scroll shows consonantal text only** — authentic (real scrolls have no
  niqqud) AND dodges combining-mark layout in the bake. Pointed Hebrew lives in
  the DOM strip.
- **Curl baked into CPU vertices** — `Raycaster` can't see shader displacement.
  `surfaceZ(u,v)` is shared by geometry AND yad auto-follow; columns pass a
  `spread` range so the sheet is continuous across all three.
- **Scrub = crossfaded word-segment triggering** (not playbackRate — chipmunk;
  not granular — worklet rabbit hole). Every sound is a real chanted word;
  slow drags reconstruct continuous chant because slices abut.
- **Highlights are uniform UV rects in the material** (3 handles: highlight,
  trail, aux — aux doubles as tutorial pulse / quiz choices / tekhelet blue via
  `setColor`). 5 floats per change, no texture uploads.
- **Divine name**: stored/rendered unpointed (`יהוה`), translit always
  `a-do-NAI`. Never put the Name in filenames or share-cards.
- **Camera lerp uses real elapsed time**, not physics-capped dt (low headless
  fps made pans crawl → test taps missed words).

### Content pipeline (IMPORTANT — Hebrew is never hand-typed)

1. Raw Sefaria API responses archived in `assets-src/sefaria/*.json`
   ("Miqra according to the Masorah", CC BY-SA).
2. `node tools/build-corpus.mjs <json> <pid> <firstVerse>` → word-token skeleton
   (strips cantillation/meteg, splits maqaf into flagged tokens, divine name → unpointed).
3. P1 lives inline in `shema.ts` (verified byte-identical by a diff script);
   p2/p3 are **generated**: edit `tools/annotations-p2p3.json` (translit/gloss/
   english/cards/facts) and re-run `node tools/emit-paragraph.mjs <skeleton> <pid> <annotations> src/content/<pid>.ts`.
   Gotcha: hand-typed Hebrew ≠ Sefaria bytes (combining-mark order) even when it looks identical.
4. Timing: `node tools/rough-timing.mjs public/audio/<track>.mp3 <pid> public/timing/<pid>.json`
   (ffmpeg silencedetect + syllable distribution + verse-boundary snapping).
   Refine by ear at `?timing=p1` (Space=mark, ,/.=nudge, Enter=replay, E=export).
   Translit scheme: hyphenated syllables, stress in CAPS, `'`=shva (Israeli pronunciation — must match recording).

## Dev workflows

```bash
npm run dev            # dev server (tests assume port 5199: npm run dev -- --port 5199)
npm run build          # tsc + vite build
npm run test           # vitest (layout unit tests)
node tools/screenshot.mjs <url> <out.png> [waitMs]   # headless shot + console dump (HOVER="x,y;x,y" env for pointer sweeps)
node tools/playthrough.mjs <shot-prefix>             # FULL e2e arc (~3.5 min — p2's 102s recording dominates)
node tools/mobile-test.mjs <shot-prefix>             # 390x844 touch viewport against preview build (port 5200)
```

- **Headless Chromium cannot do WebGPU here** — all automated checks use
  `?forceWebGL=1` (which is also the required fallback test). WebGPU path needs
  a real browser (console logs the backend).
- **Do not edit `src/` or `public/` while playthrough runs** — Vite HMR/reload
  destroys the page context mid-test.
- Playthrough must wait on `window.__shema.camSettled()` before tapping words
  (dev-only hook; also `wordScreenPos(id)`, `wordIds()`, `state()`, `touched()`).
- Debug URLs: `?debugRects=1` (word boxes), `?timing=p1|p2|p3`, `?forceWebGL=1`.

## Environment quirks (Steam Deck / SteamOS)

- Read-only root FS: Node 22 lives in `~/.local/opt/node-*` (symlinked into
  `~/.local/bin`), gh CLI in `~/.local/bin`, fonttools venv at
  `~/.local/opt/fonttools-venv` (for `pyftsubset`). ffmpeg is system-provided.
- Git identity is repo-local: Spencer Miller <spence.miller@gmail.com>.
- gh authed as `percentcer` with `workflow` scope (needed to push the Actions file).
- Permission allowlist in `.claude/settings.json` (curl, git add/commit, npm run
  build/dev/typecheck/test, screenshot tool, mkdir).

## Licensing (all attributions on the in-app Credits screen)

- Audio: SuperJew Shema 1–3, Wikimedia Commons, **CC BY-SA 3.0** (share edits alike);
  Tilsen p1 backup is **CC0**. License texts in `assets-src/licenses/`.
- Fonts: Stam Ashkenaz + Taamey Frank CLM (GPL+font-embedding-exception), Rubik (OFL).
- Hebrew text: Sefaria CC BY-SA. Parchment: ambientCG CC0.
- English translations + all copy: original to this project.

## Open items / next steps

1. **Human listen-through**: verify recording pronunciation matches the Israeli-style
   transliteration; refine rough timing maps via `?timing=` (word boundaries are
   silence/syllable estimates, not ear-verified).
2. **WebGPU visual check** in a real browser (all automated checks ran WebGL2).
3. PRD nice-to-haves not built: parasha lookup by date, Kiddush/Motzi blessings,
   scroll-closing celebration animation, CC0 modeled yad to replace primitives.
4. Baruch Shem beat is text-only (no audio in the recording — verified by loudness
   analysis); could self-record a whisper track later.
5. p1 meaning card + p1 facts live inline in `shema.ts`; p2/p3 equivalents in the
   annotations JSON — mildly inconsistent, consolidate if it ever grows.
