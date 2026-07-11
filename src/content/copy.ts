/** All UI copy in one place. Voice: smart older sibling — warm, short, never preachy. */

export const copy = {
  landing: {
    kicker: 'Your B’Mitzvah is coming.',
    headline: 'Let’s open the scroll.',
    promise:
      'Start with the Shema — the most famous words in the Torah. Hear them. Touch them. Actually understand them.',
    note: 'No Hebrew needed. About ten minutes.',
    cta: 'Start with the Shema',
    trust: 'No sign-up. No grades. Just you and a very old scroll.',
    dateLabel: 'When’s the big day? (optional)',
    parentLink: 'Grown-up in the room?',
  },
  parent: {
    title: 'For the grown-ups',
    body:
      'This is a gentle first step toward the B’Mitzvah — the Shema, heard and understood, with zero Hebrew assumed. It was built just as much for you: plenty of parents never learned this, or aren’t Jewish, and want to follow along anyway. Best on a laptop, side by side. One of you drives the pointer; swap when it feels right.',
    close: 'Got it',
  },
  tutorial: {
    hint1: 'That glowing word? Touch it with your pointer.',
    hint2: 'Now drag slowly along the line. The scroll knows the tune.',
    rtl: 'Hebrew reads this way ⟵',
  },
  baruchShem: {
    caption:
      'This line isn’t written in the scroll — people whisper it after the Shema. A secret that’s two thousand years old.',
  },
  session: {
    handOff: 'Playing with someone? Hand over the yad for the next part.',
    verseDone: 'That’s the whole line. Keep going —',
  },
  quiz: {
    intro: 'Three questions. Bet you get them.',
    items: [
      {
        id: 'q1',
        kind: 'tap-word' as const,
        playWord: 'p1v4w6',
        stem: 'Tap the word you just heard.',
        /** Word ids that glow as choices; answer is playWord. */
        choices: ['p1v4w2', 'p1v4w6', 'p1v4w4'],
        right: 'e-CHAD — "one." You knew it by sound.',
        wrong: 'So close — hear it again?',
      },
      {
        id: 'q2',
        kind: 'choice' as const,
        playWord: 'p1v4w1',
        stem: '“Sh’ma” is the very first word. What’s it asking you to do?',
        choices: ['Listen', 'Sing', 'Bow'],
        answer: 0,
        right: 'Listen. Not obey, not memorize — listen.',
        wrong: 'Hear it again — sh’MA. It’s an invitation, not an order.',
      },
      {
        id: 'q3',
        kind: 'choice' as const,
        playWord: 'p1v5w1',
        stem: 'This word kicks off the line about how to feel. What does it mean?',
        choices: ['And you shall love…', 'And you shall write…', 'And you shall walk…'],
        answer: 0,
        right: 'V’a-hav-TA — "and you shall love." Everything else follows from that.',
        wrong: 'Listen once more — this one’s the heart of the whole thing.',
      },
    ],
  },
  lamp: ['Just arrived', 'Getting the sound', 'Following along', 'Almost there', 'You know it!'],
  credits: {
    title: 'Credits & sources',
    items: [
      'Hebrew text: <a href="https://www.sefaria.org" target="_blank" rel="noopener">Sefaria</a> — “Miqra according to the Masorah” (CC BY-SA). Deuteronomy 6:4–9, Deuteronomy 11:13–21, Numbers 15:37–41.',
      'Chanted audio: “Shema 1/2/3” by SuperJew via <a href="https://commons.wikimedia.org/wiki/File:Shema_1_SuperJew.ogg" target="_blank" rel="noopener">Wikimedia Commons</a>, <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC BY-SA 3.0</a> (transcoded to MP3, sliced for word-level playback).',
      'Scroll lettering: Stam Ashkenaz CLM by Yoram Gnat, the Culmus Project (GPL with font-embedding exception).',
      'Pointed Hebrew: Taamey Frank CLM, Culmus Project (GPL+FE). UI type: Rubik (SIL OFL).',
      'Parchment textures: <a href="https://ambientcg.com/view?id=Paper005" target="_blank" rel="noopener">ambientCG Paper005</a> (CC0).',
      'Plain-English translations and all app copy are original to this project.',
      'Built with three.js (WebGPU renderer). This app supplements a real teacher — it doesn’t replace one.',
    ],
  },
  celebration: {
    title: 'You know the Shema ✓',
    body:
      'Not just the sounds — what it means. You followed the yad across the most famous paragraph in the Torah and heard every single word. That’s exactly how it starts. When you stand up there on the big day, the first line out of your mouth will already be an old friend.',
    countdown: (days: number) =>
      `${days} days until your B’Mitzvah — and you already know the Shema.`,
    explore: 'Explore the scroll freely',
    show: 'Show someone what you learned',
    comeBack: 'The scroll stays open for you. Come back anytime.',
  },
} as const;
