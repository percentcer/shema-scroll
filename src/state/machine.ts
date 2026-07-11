export type AppState =
  | { name: 'landing' }
  | { name: 'tutorial' } // beat 1: discover the yad on verse 1
  | { name: 'meaning'; card: string; next: AppState } // interstitial card
  | { name: 'baruchShem' } // the whisper moment
  | { name: 'trace'; paragraph: 'p1' | 'p2' | 'p3' }
  | { name: 'follow'; paragraph: 'p2' } // the yad glides itself; grab to take over
  | { name: 'lead'; paragraph: 'p3' } // the kid drives the final paragraph
  | { name: 'quiz'; index: number }
  | { name: 'celebration' }
  | { name: 'explore' }; // free scroll after completion

type Listener = (state: AppState, prev: AppState) => void;

/** Tiny typed FSM — any transition is legal, subscribers react. */
export class Machine {
  private listeners: Listener[] = [];
  state: AppState = { name: 'landing' };

  go(next: AppState) {
    const prev = this.state;
    this.state = next;
    for (const fn of this.listeners) fn(next, prev);
  }

  onChange(fn: Listener) {
    this.listeners.push(fn);
  }

  is(name: AppState['name']): boolean {
    return this.state.name === name;
  }
}
