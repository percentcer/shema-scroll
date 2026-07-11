import type { ShemaWord } from '../content/types';

export interface TimingEntry {
  id: string;
  start: number;
  end: number;
}

export interface TimingMap {
  audio: string;
  version: number;
  words: TimingEntry[];
}

const OVERLAP_TRIM = 0.02;
/** Rough keypress reaction latency compensation. */
const TAP_LATENCY = 0.08;

/**
 * Dev-mode word-boundary authoring tool (?timing=1).
 * Space = mark start of the NEXT word at current audio time.
 * Backspace = undo last mark. ↑/↓ select. , / . nudge ±25ms.
 * Enter = replay selected slice. R = toggle 0.75x. E = export JSON.
 * Autosaves to localStorage continuously; seeds from an existing map if present.
 */
export function runTimingTool(
  words: ShemaWord[],
  audioUrl: string,
  storageKey: string,
  seed?: TimingMap,
) {
  const root = document.querySelector<HTMLDivElement>('#ui-root')!;
  root.style.pointerEvents = 'auto';
  document.querySelector<HTMLCanvasElement>('#app-canvas')!.style.display = 'none';

  const saved = localStorage.getItem(storageKey);
  const marks = new Map<string, TimingEntry>();
  const initial: TimingMap | undefined = saved ? JSON.parse(saved) : seed;
  initial?.words.forEach((w) => marks.set(w.id, { ...w }));

  let nextIdx = [...words.keys()].find((i) => !marks.has(words[i].id)) ?? words.length;
  let selected = Math.max(0, nextIdx - 1);

  root.innerHTML = `
    <style>
      #timing { font-family: Rubik, system-ui; color: #e8d8b0; background: #1a120b;
        height: 100vh; display: flex; flex-direction: column; padding: 12px; box-sizing: border-box; }
      #timing header { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
      #timing .help { opacity: 0.7; font-size: 13px; }
      #words { flex: 1; overflow-y: auto; margin-top: 10px; display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 4px; align-content: start; }
      .w { padding: 6px 10px; border-radius: 6px; background: #2a1c10; display: flex;
        justify-content: space-between; gap: 8px; font-size: 14px; cursor: pointer; }
      .w .he { font-family: TaameyFrankCLM, serif; font-size: 17px; }
      .w.next { outline: 2px solid #d4a017; }
      .w.selected { background: #4a3418; }
      .w.marked { color: #9fe09f; }
      .w small { opacity: 0.8; }
      button { background: #d4a017; border: 0; border-radius: 6px; padding: 8px 14px;
        font-weight: 600; cursor: pointer; }
    </style>
    <div id="timing">
      <header>
        <button id="export">Export JSON (E)</button>
        <span id="status"></span>
        <span class="help">Space: mark next · Backspace: undo · ↑↓: select · , .: nudge ±25ms ·
          Enter: replay slice · R: 0.75× · click word: seek</span>
      </header>
      <audio id="audio" src="${audioUrl}" controls style="width:100%; margin-top:8px"></audio>
      <div id="words"></div>
    </div>`;

  const audio = root.querySelector<HTMLAudioElement>('#audio')!;
  const wordsEl = root.querySelector<HTMLDivElement>('#words')!;
  const statusEl = root.querySelector<HTMLSpanElement>('#status')!;

  function entries(): TimingEntry[] {
    // end = next start - trim; last end = audio duration
    const out: TimingEntry[] = [];
    for (let i = 0; i < words.length; i++) {
      const m = marks.get(words[i].id);
      if (!m) break;
      const next = i + 1 < words.length ? marks.get(words[i + 1].id) : undefined;
      out.push({
        id: m.id,
        start: m.start,
        end: next ? Math.max(m.start + 0.05, next.start - OVERLAP_TRIM) : audio.duration || m.start + 1,
      });
    }
    return out;
  }

  function save() {
    const map: TimingMap = { audio: audioUrl.replace(/^.*\/audio\//, 'audio/'), version: 1, words: entries() };
    localStorage.setItem(storageKey, JSON.stringify(map));
    return map;
  }

  function render() {
    wordsEl.innerHTML = words
      .map((w, i) => {
        const m = marks.get(w.id);
        const cls = ['w', i === nextIdx ? 'next' : '', i === selected ? 'selected' : '', m ? 'marked' : '']
          .filter(Boolean)
          .join(' ');
        return `<div class="${cls}" data-i="${i}">
          <span class="he">${w.hePointed}</span>
          <span><small>${w.translit}</small> ${m ? `<small>${m.start.toFixed(2)}</small>` : ''}</span>
        </div>`;
      })
      .join('');
    statusEl.textContent = `${marks.size}/${words.length} marked · selected: ${words[selected]?.translit ?? '-'}`;
  }

  wordsEl.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.w');
    if (!el) return;
    selected = Number(el.dataset.i);
    const m = marks.get(words[selected].id);
    if (m) audio.currentTime = m.start;
    render();
  });

  document.addEventListener('keydown', (e) => {
    if (e.target === audio) return;
    const sel = words[selected];
    switch (e.code) {
      case 'Space': {
        e.preventDefault();
        if (nextIdx >= words.length) break;
        const t = Math.max(0, audio.currentTime - TAP_LATENCY * audio.playbackRate);
        marks.set(words[nextIdx].id, { id: words[nextIdx].id, start: t, end: t + 1 });
        selected = nextIdx;
        nextIdx++;
        save();
        break;
      }
      case 'Backspace': {
        e.preventDefault();
        if (nextIdx === 0) break;
        nextIdx--;
        marks.delete(words[nextIdx].id);
        selected = Math.max(0, nextIdx - 1);
        save();
        break;
      }
      case 'ArrowUp':
        e.preventDefault();
        selected = Math.max(0, selected - 1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        selected = Math.min(words.length - 1, selected + 1);
        break;
      case 'Comma':
      case 'Period': {
        const m = sel && marks.get(sel.id);
        if (!m) break;
        m.start = Math.max(0, m.start + (e.code === 'Comma' ? -0.025 : 0.025));
        save();
        break;
      }
      case 'Enter': {
        e.preventDefault();
        const es = entries();
        const en = es.find((x) => x.id === sel?.id);
        if (!en) break;
        audio.currentTime = en.start;
        audio.play();
        const stop = () => {
          if (audio.currentTime >= en.end) {
            audio.pause();
            audio.removeEventListener('timeupdate', stop);
          }
        };
        audio.addEventListener('timeupdate', stop);
        break;
      }
      case 'KeyR':
        audio.playbackRate = audio.playbackRate === 1 ? 0.75 : 1;
        break;
      case 'KeyE': {
        const blob = new Blob([JSON.stringify(save(), null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = storageKey + '.json';
        a.click();
        break;
      }
      default:
        return;
    }
    render();
  });

  render();
}
