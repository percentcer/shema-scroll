const KEY = 'bmc.progress.v1';

export interface Progress {
  touchedWords: string[];
  versesCompleted: string[];
  paragraphsCompleted: string[];
  quizDone: boolean;
  celebrated: boolean;
  /** ISO date of the B'Mitzvah, if the kid shared it. */
  bmitzvahDate?: string;
}

const empty: Progress = {
  touchedWords: [],
  versesCompleted: [],
  paragraphsCompleted: [],
  quizDone: false,
  celebrated: false,
};

export function loadProgress(): Progress {
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...empty };
  }
}

export function saveProgress(p: Progress) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function daysUntil(iso: string): number {
  const ms = new Date(iso + 'T12:00:00').getTime() - Date.now();
  return Math.max(0, Math.round(ms / 86_400_000));
}
