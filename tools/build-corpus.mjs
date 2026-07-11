#!/usr/bin/env node
// Generates word-token skeletons from the archived Sefaria API responses.
// Usage: node tools/build-corpus.mjs assets-src/sefaria/Deuteronomy.6.4-9.json p1 4
//   (args: file, paragraphId, firstVerseNumber)
// Emits JSON to stdout: verses -> words with hePointed auto-derived
// (cantillation stripped, divine name unpointed, maqaf split + flagged).
// Transliteration and glosses are authored by hand afterwards.
import { readFileSync } from 'node:fs';

const [file, pid, firstVerseArg] = process.argv.slice(2);
if (!file || !pid || !firstVerseArg) {
  console.error('usage: build-corpus.mjs <sefaria.json> <paragraphId> <firstVerseNumber>');
  process.exit(1);
}

const data = JSON.parse(readFileSync(file, 'utf8'));
const heVerses = Array.isArray(data.he) ? data.he : [data.he];
const bookRef = data.ref.replace(/ \d.*$/, ''); // e.g. "Deuteronomy"
const chapter = Number(data.sections[0]);

const CANTILLATION = /[֑-ֽֿ֯]/g; // taamim + meteg + rafe
const DIVINE = /^יְ?הֹוָה$/;

function cleanVerse(html) {
  return html
    .replace(/<sup[^>]*>.*?<\/sup>/gs, '')
    .replace(/<i[^>]*>.*?<\/i>/gs, '')
    .replace(/<span[^>]*>\{[ספ]\}<\/span>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&thinsp;|&nbsp;/g, ' ')
    .replace(/[׃׀]/g, ' ') // sof pasuq, paseq
    .replace(/\{[ספ]\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const verses = heVerses.map((html, vi) => {
  const verseNum = Number(firstVerseArg) + vi;
  const tokens = [];
  for (const chunk of cleanVerse(html).split(' ')) {
    if (!chunk) continue;
    const parts = chunk.split('־'); // maqaf
    parts.forEach((part, i) => {
      if (!part) return;
      const stripped = part.replace(CANTILLATION, '');
      const isDivine = DIVINE.test(stripped);
      tokens.push({
        hePointed: isDivine ? 'יהוה' : stripped,
        translit: isDivine ? 'a-do-NAI' : 'TODO',
        ...(isDivine ? { flags: { divineName: true } } : {}),
        ...(i < parts.length - 1 ? { flags: { maqafNext: true } } : {}),
      });
    });
  }
  return {
    id: `${pid}v${verseNum}`,
    ref: `${bookRef} ${chapter}:${verseNum}`,
    sefariaUrl: `https://www.sefaria.org/${bookRef.replace(/ /g, '_')}.${chapter}.${verseNum}`,
    english: 'TODO',
    words: tokens.map((t, wi) => ({ id: `${pid}v${verseNum}w${wi + 1}`, ...t })),
  };
});

console.log(JSON.stringify(verses, null, 2));
