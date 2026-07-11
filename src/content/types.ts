/**
 * Content model for the Shema corpus.
 *
 * Word IDs ("p1v4w3" = paragraph.verse.wordIndex) are the contract shared by
 * text layout, audio timing maps, highlights, and UI. NEVER renumber IDs once
 * a timing map referencing them exists.
 *
 * Hebrew provenance: Sefaria "Miqra according to the Masorah" (CC BY-SA).
 * Raw API responses archived in assets-src/sefaria/.
 */

export interface WordFlags {
  /** The Tetragrammaton: scroll AND learner strip show it unpointed; translit is always "a-do-NAI". */
  divineName?: boolean;
  /** Indices into the consonantal (scroll) string rendered enlarged, per scribal tradition. */
  enlarged?: number[];
  /** Pointed text joins to the next word with a maqaf; the scroll renders a space. */
  maqafNext?: boolean;
}

export interface ShemaWord {
  id: string;
  /** Niqqud, no cantillation — for the learner strip. */
  hePointed: string;
  /** Consonantal override; when absent, derived by stripping points from hePointed. */
  heScroll?: string;
  /** Hyphenated syllables, stressed syllable in CAPS, ' = shva: "yis-ra-EIL". */
  translit: string;
  /** Plain-English gloss; only ~35 anchor words carry one. */
  gloss?: string;
  flags?: WordFlags;
}

export interface ShemaVerse {
  id: string;
  ref: string;
  sefariaUrl: string;
  words: ShemaWord[];
  /** Our own kid-plain line translation. */
  english: string;
}

export interface MeaningCard {
  id: string;
  title: string;
  body: string;
  /** Verse id the card anchors to. */
  anchorVerse: string;
}

export interface FactChip {
  id: string;
  /** Word id the chip surfaces next to. */
  anchorWord: string;
  body: string;
}

export interface QuizItem {
  id: string;
  /** Word id whose audio slice the question plays. */
  playWord: string;
  stem: string;
  options: string[];
  answer: number;
  right: string;
  wrong: string;
}

export type ParagraphMode = 'trace' | 'follow' | 'lead';

export interface ShemaParagraph {
  id: 'p1' | 'p2' | 'p3';
  nickname: string;
  mode: ParagraphMode;
  /** Path under BASE_URL, e.g. "audio/superjew-p1.mp3". Timing map keys against this. */
  audioTrack: string;
  verses: ShemaVerse[];
  meaningCard: MeaningCard;
  facts: FactChip[];
}

/** Liturgical text NOT in the Torah — rendered off-parchment, always. */
export interface Aside {
  id: string;
  hePointed: string;
  translit: string;
  english: string;
  explainer: string;
  afterVerse: string;
}

export interface ShemaContent {
  paragraphs: ShemaParagraph[];
  asides: Aside[];
  /** The Shema-line card (beat 2), distinct from p1's end-of-paragraph card. */
  meaningCardZero: MeaningCard;
}

/** Hebrew combining marks: cantillation (0591–05AF) + meteg (05BD). */
const TAAMIM_AND_METEG = /[֑-ֽ֯]/g;
/** All pointing incl. niqqud (05B0–05BC, 05C1, 05C2, 05C7). */
const ALL_POINTS = /[֑-ׇ]/g;

/** Consonantal form for the scroll layer. */
export function toScrollText(word: ShemaWord): string {
  return word.heScroll ?? word.hePointed.replace(ALL_POINTS, '');
}

export function stripCantillation(he: string): string {
  return he.replace(TAAMIM_AND_METEG, '');
}
