import type { ShemaContent } from './types';

/**
 * Stage-1 seed: paragraph 1, verse 1 (Deuteronomy 6:4) only.
 * Hebrew copied from Sefaria "Miqra according to the Masorah" with
 * cantillation stripped, niqqud kept (raw source: assets-src/sefaria/).
 * The divine name is stored unpointed by design — see types.ts.
 */
export const shema: ShemaContent = {
  meaningCardZero: {
    id: 'card-0',
    title: 'You just read the most famous sentence in the Torah.',
    body:
      'Sh’ma Yisrael — "Listen, Israel." Not obey. Not memorize. Listen. ' +
      'The whole line says one big thing: underneath everything, there’s one God — ' +
      'one-ness holding it all together. Jews have said these six words every morning ' +
      'and every night for more than two thousand years. When you say them at your ' +
      'B’Mitzvah, you’re joining that chain. And now you know exactly how they sound.',
    anchorVerse: 'p1v4',
  },
  asides: [
    {
      id: 'baruch-shem',
      hePointed: 'בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד',
      translit: 'ba-RUCH sheim k’VOD mal-chu-TO l’o-LAM va-ED',
      english: 'Blessed is the name of God’s glorious majesty forever and ever.',
      explainer:
        'This line isn’t written in the scroll — people whisper it after the Shema. ' +
        'You’re hearing a secret that’s two thousand years old.',
      afterVerse: 'p1v4',
    },
  ],
  paragraphs: [
    {
      id: 'p1',
      nickname: 'Sh’ma & V’ahavta',
      mode: 'trace',
      audioTrack: 'audio/superjew-p1.mp3',
      meaningCard: {
        id: 'card-p1',
        title: 'Love, then everything else',
        body: '', // authored in Stage 2
        anchorVerse: 'p1v9',
      },
      facts: [],
      verses: [
        {
          id: 'p1v4',
          ref: 'Deuteronomy 6:4',
          sefariaUrl: 'https://www.sefaria.org/Deuteronomy.6.4',
          english: 'Listen, Israel: the Eternal is our God — the Eternal is One.',
          words: [
            {
              id: 'p1v4w1',
              hePointed: 'שְׁמַע',
              translit: 'sh’MA',
              gloss: 'Listen!',
              flags: { enlarged: [2] },
            },
            { id: 'p1v4w2', hePointed: 'יִשְׂרָאֵל', translit: 'yis-ra-EIL', gloss: 'Israel' },
            {
              id: 'p1v4w3',
              hePointed: 'יהוה',
              translit: 'a-do-NAI',
              gloss: 'God',
              flags: { divineName: true },
            },
            { id: 'p1v4w4', hePointed: 'אֱלֹהֵינוּ', translit: 'e-lo-HEI-nu', gloss: 'our God' },
            {
              id: 'p1v4w5',
              hePointed: 'יהוה',
              translit: 'a-do-NAI',
              flags: { divineName: true },
            },
            {
              id: 'p1v4w6',
              hePointed: 'אֶחָד',
              translit: 'e-CHAD',
              gloss: 'one',
              flags: { enlarged: [2] },
            },
          ],
        },
      ],
    },
  ],
};
