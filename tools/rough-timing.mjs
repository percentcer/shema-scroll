#!/usr/bin/env node
// Rough first-pass timing map: distribute words across silence-delimited
// voiced segments proportional to transliteration syllable counts.
// A human pass with the ?timing=1 tool refines this.
// Usage: node tools/rough-timing.mjs <audio.mp3> <paragraphId> <out.json>
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const [audio, pid, out] = process.argv.slice(2);

// Words in reading order from the content modules (id + translit).
const src = ['shema.ts', 'p2.ts', 'p3.ts']
  .map((f) => {
    try {
      return readFileSync(`src/content/${f}`, 'utf8');
    } catch {
      return '';
    }
  })
  .join('\n');
const words = [...src.matchAll(/id: '(p\dv\d+w\d+)', hePointed: '[^']+', translit: '([^']+)'/g)]
  .map((m) => ({ id: m[1], translit: m[2] }))
  .filter((w) => w.id.startsWith(pid));
if (!words.length) throw new Error(`no words found for ${pid}`);

const syllables = (t) => t.split(/[-\s'’]/).filter(Boolean).length;
const totalSyl = words.reduce((a, w) => a + syllables(w.translit), 0);

// Voiced segments from ffmpeg silencedetect.
const log = execSync(
  `ffmpeg -i ${audio} -af silencedetect=noise=-20dB:d=0.12 -f null - 2>&1`,
  { encoding: 'utf8' },
);
const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
const duration = Number(
  execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${audio}`, {
    encoding: 'utf8',
  }),
);
const segs = [];
let cursor = 0.15; // skip leading room tone
for (let i = 0; i < starts.length; i++) {
  if (starts[i] - cursor > 0.3) segs.push([cursor, starts[i]]);
  cursor = ends[i];
}
if (duration - cursor > 0.3) segs.push([cursor, duration]);

const voiced = segs.reduce((a, [s, e]) => a + (e - s), 0);
console.error(`${words.length} words, ${totalSyl} syllables, ${segs.length} segments, ${voiced.toFixed(1)}s voiced`);

// Greedy allocation: each segment takes a contiguous word run whose syllable
// share matches its duration share; words inside a segment split by syllables.
const entries = [];
let wi = 0;
let sylUsed = 0;
for (let si = 0; si < segs.length; si++) {
  const [s, e] = segs[si];
  const last = si === segs.length - 1;
  const targetSyl = last ? totalSyl - sylUsed : (totalSyl * (e - s)) / voiced;
  const runWords = [];
  let runSyl = 0;
  while (wi < words.length && (runSyl < targetSyl - 0.5 || runWords.length === 0)) {
    // leave at least one word per remaining segment
    if (!last && words.length - wi <= segs.length - si - 1 && runWords.length > 0) break;
    runWords.push(words[wi]);
    runSyl += syllables(words[wi].translit);
    wi++;
    // Chanters breathe at verse ends: snap to a verse boundary when close to target.
    const nextIsNewVerse = wi < words.length && /w1$/.test(words[wi].id);
    if (nextIsNewVerse && runSyl >= targetSyl - 3.5) break;
  }
  sylUsed += runSyl;
  let t = s;
  for (const w of runWords) {
    const dur = ((e - s) * syllables(w.translit)) / runSyl;
    entries.push({ id: w.id, start: Number(t.toFixed(3)), end: Number((t + dur - 0.02).toFixed(3)) });
    t += dur;
  }
}
if (wi < words.length) console.error(`WARNING: ${words.length - wi} words unallocated`);

const map = { audio: `audio/${audio.split('/').pop()}`, version: 0, words: entries };
writeFileSync(out, JSON.stringify(map, null, 2));
console.error(`wrote ${out}`);
