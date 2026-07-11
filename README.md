# The Living Scroll — B'Mitzvah Confidence Coach

A proof-of-concept for the Common Era vibe-coding sprint: learn the Shema by
**touching an actual Torah scroll**.

A weathered parchment scroll renders in 3D (three.js WebGPU, WebGL2 fallback).
Your cursor becomes a **yad** — the silver pointer used to read Torah — and as
you drag it across the calligraphy, a real cantorial recording chants the words
under your hand, word by word. Transliteration and plain-English meaning follow
the yad. No Hebrew knowledge assumed, no login, warm-not-preachy tone.

## The experience

1. **Landing** — "Your B'Mitzvah is coming. Let's open the scroll."
2. **Discover the yad** — one glowing word: *sh'MA*. Touch it, it sings.
3. **The star line** — trace Deut 6:4 end to end, then the meaning lands.
4. **Baruch Shem** — the whispered line appears floating *beside* the scroll,
   because it isn't written in a Torah scroll. Honesty as magic.
5. **V'ahavta** (trace) → **paragraph 2** (the yad glides itself — grab it
   anytime) → **paragraph 3** (you lead). Interact → watch → lead: the kid
   ends more in control than they started.
6. **Three questions** — answered by tapping glowing words on the scroll.
7. **"You know the Shema ✓"** — with a countdown to the big day.

## Correctness choices

- Scroll layer is **consonantal STaM script** (real scrolls have no vowels) —
  pointed Hebrew lives in the learner strip. Enlarged ע and ד in line one.
- Hebrew text byte-verified against Sefaria's "Miqra according to the Masorah".
- The divine name renders unpointed; transliteration always reads *a-do-NAI*.
- Baruch Shem never touches the parchment.
- Audio is real human chanting (CC recordings) — never synthesized.

## Dev

```bash
npm install
npm run dev          # → http://localhost:5173
npm run build        # typecheck + bundle to dist/
npm run test         # layout unit tests
```

Useful dev URLs: `?forceWebGL=1` (test the fallback), `?debugRects=1`
(word hit-boxes), `?timing=p1|p2|p3` (word-timing authoring tool).

Asset licenses: see `assets-src/licenses/` and the in-app Credits screen.
