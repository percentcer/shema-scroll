import { p2 } from './p2';
import { p3 } from './p3';
import type { ShemaContent } from './types';

/**
 * Hebrew: generated from Sefaria "Miqra according to the Masorah" via
 * tools/build-corpus.mjs (cantillation stripped, niqqud kept, divine name
 * stored unpointed by design — see types.ts). Raw API responses archived in
 * assets-src/sefaria/. Transliteration follows the recording (Israeli
 * pronunciation): hyphenated syllables, stressed syllable in CAPS, ' = shva.
 *
 * Paragraphs 2 (Deut 11:13-21) and 3 (Num 15:37-41) are added in Stage 8.
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
        body:
          'Notice the order. First: love God with everything you’ve got. Then: keep these ' +
          'words close — teach them, talk about them, tie them on, write them on your ' +
          'doorway. The Torah isn’t asking you to fake anything. It starts with the feeling, ' +
          'and everything else is just ways to remember it — at home, on the road, morning ' +
          'and night. That’s why these exact words live inside every mezuzah on every ' +
          'Jewish doorpost on Earth.',
        anchorVerse: 'p1v9',
      },
      facts: [
        {
          id: 'fact-enlarged',
          anchorWord: 'p1v4w6',
          body:
            'Look closely at the first line. The ע ending sh’MA and the ד ending e-CHAD are ' +
            'written extra large — in every kosher Torah scroll on Earth. Together they spell ' +
            'עֵד, eid — "witness." The scribes’ way of saying: whoever reads this line is a ' +
            'witness to it. That’s you now. (The big ד also keeps "one" from being misread as ' +
            '"another" — one letter can matter that much.)',
        },
        {
          id: 'fact-no-vowels',
          anchorWord: 'p1v5w1',
          body:
            'The scroll has no vowel marks — none. Torah readers memorize how every word ' +
            'sounds before the big day. Which means the way you’re practicing right now is ' +
            'exactly how Torah readers have trained for two thousand years.',
        },
        {
          id: 'fact-mezuzah',
          anchorWord: 'p1v9w3',
          body:
            'M’zu-ZOT means doorposts — and this very paragraph is the scroll rolled up ' +
            'inside every mezuzah. If you’ve ever walked through a Jewish doorway, you’ve ' +
            'been walking past these exact words your whole life.',
        },
      ],
      verses: [
        {
          id: 'p1v4',
          ref: 'Deuteronomy 6:4',
          sefariaUrl: 'https://www.sefaria.org/Deuteronomy.6.4',
          english: 'Listen, Israel: the Eternal is our God — the Eternal is One.',
          words: [
            { id: 'p1v4w1', hePointed: 'שְׁמַע', translit: 'sh’MA', gloss: 'Listen!', flags: { enlarged: [2] } },
            { id: 'p1v4w2', hePointed: 'יִשְׂרָאֵל', translit: 'yis-ra-EIL', gloss: 'Israel' },
            { id: 'p1v4w3', hePointed: 'יהוה', translit: 'a-do-NAI', gloss: 'God', flags: { divineName: true } },
            { id: 'p1v4w4', hePointed: 'אֱלֹהֵינוּ', translit: 'e-lo-HEI-nu', gloss: 'our God' },
            { id: 'p1v4w5', hePointed: 'יהוה', translit: 'a-do-NAI', flags: { divineName: true } },
            { id: 'p1v4w6', hePointed: 'אֶחָד', translit: 'e-CHAD', gloss: 'one', flags: { enlarged: [2] } },
          ],
        },
        {
          id: 'p1v5',
          ref: 'Deuteronomy 6:5',
          sefariaUrl: 'https://www.sefaria.org/Deuteronomy.6.5',
          english: 'Love God with all your heart, all your soul, and everything you’ve got.',
          words: [
            { id: 'p1v5w1', hePointed: 'וְאָהַבְתָּ', translit: 'v’a-hav-TA', gloss: 'and you shall love' },
            { id: 'p1v5w2', hePointed: 'אֵת', translit: 'eit' },
            { id: 'p1v5w3', hePointed: 'יהוה', translit: 'a-do-NAI', flags: { divineName: true } },
            { id: 'p1v5w4', hePointed: 'אֱלֹהֶיךָ', translit: 'e-lo-HE-cha', gloss: 'your God' },
            { id: 'p1v5w5', hePointed: 'בְּכׇל', translit: 'b’CHOL', gloss: 'with all', flags: { maqafNext: true } },
            { id: 'p1v5w6', hePointed: 'לְבָבְךָ', translit: 'l’vav-CHA', gloss: 'your heart' },
            { id: 'p1v5w7', hePointed: 'וּבְכׇל', translit: 'u-v’CHOL', flags: { maqafNext: true } },
            { id: 'p1v5w8', hePointed: 'נַפְשְׁךָ', translit: 'naf-sh’CHA', gloss: 'your soul' },
            { id: 'p1v5w9', hePointed: 'וּבְכׇל', translit: 'u-v’CHOL', flags: { maqafNext: true } },
            { id: 'p1v5w10', hePointed: 'מְאֹדֶךָ', translit: 'm’o-DE-cha', gloss: 'everything you’ve got' },
          ],
        },
        {
          id: 'p1v6',
          ref: 'Deuteronomy 6:6',
          sefariaUrl: 'https://www.sefaria.org/Deuteronomy.6.6',
          english: 'Keep these words on your heart, today.',
          words: [
            { id: 'p1v6w1', hePointed: 'וְהָיוּ', translit: 'v’ha-YU', gloss: 'and they shall be' },
            { id: 'p1v6w2', hePointed: 'הַדְּבָרִים', translit: 'ha-d’va-RIM', gloss: 'the words' },
            { id: 'p1v6w3', hePointed: 'הָאֵלֶּה', translit: 'ha-EI-le', gloss: 'these' },
            { id: 'p1v6w4', hePointed: 'אֲשֶׁר', translit: 'a-SHER' },
            { id: 'p1v6w5', hePointed: 'אָנֹכִי', translit: 'a-no-CHI', gloss: 'I' },
            { id: 'p1v6w6', hePointed: 'מְצַוְּךָ', translit: 'm’tza-v’CHA', gloss: 'command you' },
            { id: 'p1v6w7', hePointed: 'הַיּוֹם', translit: 'ha-YOM', gloss: 'today' },
            { id: 'p1v6w8', hePointed: 'עַל', translit: 'al', gloss: 'on', flags: { maqafNext: true } },
            { id: 'p1v6w9', hePointed: 'לְבָבֶךָ', translit: 'l’va-VE-cha', gloss: 'your heart' },
          ],
        },
        {
          id: 'p1v7',
          ref: 'Deuteronomy 6:7',
          sefariaUrl: 'https://www.sefaria.org/Deuteronomy.6.7',
          english:
            'Teach them to your kids. Talk about them at home and on the road, when you lie down and when you get up.',
          words: [
            { id: 'p1v7w1', hePointed: 'וְשִׁנַּנְתָּם', translit: 'v’shi-nan-TAM', gloss: 'teach them' },
            { id: 'p1v7w2', hePointed: 'לְבָנֶיךָ', translit: 'l’va-NE-cha', gloss: 'to your kids' },
            { id: 'p1v7w3', hePointed: 'וְדִבַּרְתָּ', translit: 'v’di-bar-TA', gloss: 'and talk' },
            { id: 'p1v7w4', hePointed: 'בָּם', translit: 'bam', gloss: 'about them' },
            { id: 'p1v7w5', hePointed: 'בְּשִׁבְתְּךָ', translit: 'b’shiv-t’CHA', gloss: 'when you sit' },
            { id: 'p1v7w6', hePointed: 'בְּבֵיתֶךָ', translit: 'b’vei-TE-cha', gloss: 'at home' },
            { id: 'p1v7w7', hePointed: 'וּבְלֶכְתְּךָ', translit: 'u-v’lech-t’CHA', gloss: 'and when you walk' },
            { id: 'p1v7w8', hePointed: 'בַדֶּרֶךְ', translit: 'va-DE-rech', gloss: 'on the road' },
            { id: 'p1v7w9', hePointed: 'וּבְשׇׁכְבְּךָ', translit: 'u-v’shoch-b’CHA', gloss: 'when you lie down' },
            { id: 'p1v7w10', hePointed: 'וּבְקוּמֶךָ', translit: 'u-v’ku-ME-cha', gloss: 'and when you get up' },
          ],
        },
        {
          id: 'p1v8',
          ref: 'Deuteronomy 6:8',
          sefariaUrl: 'https://www.sefaria.org/Deuteronomy.6.8',
          english: 'Tie them as a sign on your hand; let them sit right between your eyes.',
          words: [
            { id: 'p1v8w1', hePointed: 'וּקְשַׁרְתָּם', translit: 'u-k’shar-TAM', gloss: 'tie them' },
            { id: 'p1v8w2', hePointed: 'לְאוֹת', translit: 'l’OT', gloss: 'as a sign' },
            { id: 'p1v8w3', hePointed: 'עַל', translit: 'al', flags: { maqafNext: true } },
            { id: 'p1v8w4', hePointed: 'יָדֶךָ', translit: 'ya-DE-cha', gloss: 'your hand' },
            { id: 'p1v8w5', hePointed: 'וְהָיוּ', translit: 'v’ha-YU' },
            { id: 'p1v8w6', hePointed: 'לְטֹטָפֹת', translit: 'l’to-ta-FOT', gloss: 'as symbols' },
            { id: 'p1v8w7', hePointed: 'בֵּין', translit: 'bein', gloss: 'between' },
            { id: 'p1v8w8', hePointed: 'עֵינֶיךָ', translit: 'ei-NE-cha', gloss: 'your eyes' },
          ],
        },
        {
          id: 'p1v9',
          ref: 'Deuteronomy 6:9',
          sefariaUrl: 'https://www.sefaria.org/Deuteronomy.6.9',
          english: 'Write them on the doorposts of your house and on your gates.',
          words: [
            { id: 'p1v9w1', hePointed: 'וּכְתַבְתָּם', translit: 'u-ch’tav-TAM', gloss: 'write them' },
            { id: 'p1v9w2', hePointed: 'עַל', translit: 'al', flags: { maqafNext: true } },
            { id: 'p1v9w3', hePointed: 'מְזֻזוֹת', translit: 'm’zu-ZOT', gloss: 'doorposts' },
            { id: 'p1v9w4', hePointed: 'בֵּיתֶךָ', translit: 'bei-TE-cha', gloss: 'your house' },
            { id: 'p1v9w5', hePointed: 'וּבִשְׁעָרֶיךָ', translit: 'u-vish-a-RE-cha', gloss: 'and your gates' },
          ],
        },
      ],
    },
    p2,
    p3,
  ],
};

/** Flat word list for a paragraph, in reading order. */
export function paragraphWords(pid: 'p1' | 'p2' | 'p3') {
  const p = shema.paragraphs.find((x) => x.id === pid);
  return p ? p.verses.flatMap((v) => v.words) : [];
}
