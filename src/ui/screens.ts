import { copy } from '../content/copy';

/** DOM overlay screens: landing, hints, meaning cards, Baruch Shem, quiz, celebration, lamp. */
export class Screens {
  private root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    root.insertAdjacentHTML(
      'afterbegin',
      `<style>
        .layer { position: fixed; inset: 0; display: flex; align-items: center;
          justify-content: center; pointer-events: auto; z-index: 10;
          font-family: Rubik, system-ui; color: #f3e5c0;
          opacity: 0; transition: opacity 0.5s ease; }
        .layer.on { opacity: 1; }
        .layer.off { pointer-events: none !important; }
        .scrim { background: rgba(14, 9, 4, 0.72); backdrop-filter: blur(7px); }
        .card { max-width: 520px; margin: 16px; padding: 34px 38px; border-radius: 20px;
          background: rgba(26, 18, 11, 0.96); border: 1px solid rgba(212, 160, 23, 0.35);
          box-shadow: 0 12px 60px rgba(0,0,0,0.6); text-align: center; }
        .card h1 { font-size: 30px; font-weight: 700; margin-bottom: 12px; color: #f7ecd0; }
        .card h2 { font-size: 22px; font-weight: 600; margin-bottom: 12px; }
        .card p { font-size: 16px; line-height: 1.55; color: #d9c9a3; }
        .card .kicker { color: #d4a017; font-weight: 600; letter-spacing: 0.04em;
          text-transform: uppercase; font-size: 13px; margin-bottom: 8px; }
        .btn { background: #d4a017; color: #221608; border: 0; border-radius: 26px;
          padding: 14px 34px; font: 700 17px Rubik, system-ui; cursor: pointer;
          margin-top: 22px; transition: transform 0.12s ease, box-shadow 0.12s ease; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(212,160,23,0.35); }
        .btn.ghost { background: transparent; color: #d4a017; border: 1.5px solid #d4a017; }
        .small { font-size: 13px; color: #9a8a6a; margin-top: 14px; }
        .linkish { background: none; border: 0; color: #b8a888; text-decoration: underline;
          cursor: pointer; font: 400 13px Rubik, system-ui; margin-top: 10px; }
        #hint { position: fixed; left: 50%; bottom: 88px; transform: translateX(-50%);
          background: rgba(26,18,11,0.9); border: 1px solid rgba(212,160,23,0.3);
          padding: 10px 22px; border-radius: 22px; font: 500 15px Rubik, system-ui;
          color: #e8d8b0; z-index: 5; pointer-events: none; opacity: 0;
          transition: opacity 0.4s ease; white-space: nowrap; }
        #hint.on { opacity: 1; }
        #lamp { position: fixed; top: 18px; right: 20px; z-index: 5; display: flex;
          align-items: center; gap: 10px; pointer-events: none;
          font: 600 13px Rubik, system-ui; color: #d9c9a3; }
        #lamp .flame { width: 26px; height: 26px; border-radius: 50%;
          background: radial-gradient(circle at 50% 60%, #ffd76a, #d4a017 55%, transparent 72%);
          filter: saturate(var(--lampSat, 0.2)) brightness(var(--lampBright, 0.45));
          transition: filter 0.8s ease; box-shadow: 0 0 18px rgba(212, 160, 23, var(--lampGlow, 0.05)); }
        #chip { position: fixed; z-index: 6; max-width: 340px; padding: 14px 18px;
          background: rgba(26,18,11,0.95); border: 1px solid rgba(212,160,23,0.4);
          border-radius: 14px; font: 400 13.5px/1.5 Rubik, system-ui; color: #d9c9a3;
          pointer-events: none; opacity: 0; transition: opacity 0.4s ease; }
        #chip.on { opacity: 1; }
        #chip .chip-kicker { color: #d4a017; font-weight: 700; font-size: 11px;
          letter-spacing: 0.08em; text-transform: uppercase; display: block; margin-bottom: 5px; }
        #bshem { text-align: center; }
        #bshem .he { font: 500 42px TaameyFrankCLM, serif; color: #ffe9b0;
          text-shadow: 0 0 26px rgba(255, 214, 106, 0.55); display: block; }
        #bshem .tl { font: 600 17px Rubik; color: #d4a017; display: block; margin-top: 10px; }
        #bshem .en { font: 400 15px Rubik; color: #d9c9a3; display: block; margin-top: 6px; }
        #bshem .why { font: 400 13.5px Rubik; color: #9a8a6a; display: block; margin-top: 16px;
          max-width: 420px; margin-left: auto; margin-right: auto; line-height: 1.5; }
        .quiz-opts { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
        .quiz-opts button { background: rgba(212,160,23,0.12); border: 1.5px solid rgba(212,160,23,0.4);
          color: #f3e5c0; border-radius: 12px; padding: 13px 18px; font: 500 15px Rubik;
          cursor: pointer; transition: background 0.15s ease; }
        .quiz-opts button:hover { background: rgba(212,160,23,0.28); }
        input[type=date] { background: rgba(212,160,23,0.1); border: 1px solid rgba(212,160,23,0.35);
          color: #e8d8b0; border-radius: 10px; padding: 9px 12px; font: 500 14px Rubik;
          margin-top: 8px; color-scheme: dark; }
        @media (max-width: 600px) { .card { padding: 26px 22px; } .card h1 { font-size: 24px; } }
      </style>
      <div id="hint"></div>
      <div id="lamp"><div class="flame"></div><span id="lamp-label"></span></div>
      <div id="chip"></div>
      <button id="credits-link" style="position:fixed;bottom:10px;right:14px;z-index:5;
        pointer-events:auto;background:none;border:0;color:#6a5c44;cursor:pointer;
        font:400 12px Rubik,system-ui;text-decoration:underline">${copy.credits.title}</button>`,
    );
    document.getElementById('credits-link')!.addEventListener('click', () => {
      const m = this.layer(
        'credits-modal',
        `<div class="card" style="text-align:left;max-width:600px">
          <h2>${copy.credits.title}</h2>
          <ul style="padding-left:18px;display:flex;flex-direction:column;gap:8px">
            ${copy.credits.items.map((i) => `<li style="font:400 13.5px/1.5 Rubik;color:#d9c9a3">${i}</li>`).join('')}
          </ul>
          <button class="btn" id="cclose">Close</button></div>`,
      );
      m.querySelectorAll('a').forEach((a) => (a.style.color = '#d4a017'));
      m.querySelector('#cclose')!.addEventListener('click', () => this.dismiss('credits-modal'));
    });
  }

  private layer(id: string, inner: string, scrim = true): HTMLElement {
    document.getElementById(id)?.remove();
    this.root.insertAdjacentHTML(
      'beforeend',
      `<div class="layer ${scrim ? 'scrim' : ''}" id="${id}">${inner}</div>`,
    );
    const el = document.getElementById(id)!;
    requestAnimationFrame(() => el.classList.add('on'));
    return el;
  }

  dismiss(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('on');
    el.classList.add('off');
    setTimeout(() => el.remove(), 550);
  }

  landing(onStart: (date?: string) => void) {
    const el = this.layer(
      'landing',
      `<div class="card">
        <div class="kicker">${copy.landing.kicker}</div>
        <h1>${copy.landing.headline}</h1>
        <p>${copy.landing.promise}</p>
        <p class="small">${copy.landing.note}</p>
        <div style="margin-top:16px">
          <label class="small" for="bdate">${copy.landing.dateLabel}</label><br/>
          <input type="date" id="bdate" />
        </div>
        <button class="btn" id="start">${copy.landing.cta}</button>
        <p class="small">${copy.landing.trust}</p>
        <button class="linkish" id="parent">${copy.landing.parentLink}</button>
      </div>`,
    );
    el.querySelector<HTMLButtonElement>('#start')!.addEventListener('click', () => {
      const date = el.querySelector<HTMLInputElement>('#bdate')!.value || undefined;
      this.dismiss('landing');
      onStart(date);
    });
    el.querySelector<HTMLButtonElement>('#parent')!.addEventListener('click', () => {
      const m = this.layer(
        'parent-modal',
        `<div class="card"><h2>${copy.parent.title}</h2><p>${copy.parent.body}</p>
         <button class="btn" id="close">${copy.parent.close}</button></div>`,
      );
      m.querySelector('#close')!.addEventListener('click', () => this.dismiss('parent-modal'));
    });
  }

  hint(text: string | null) {
    const el = document.getElementById('hint')!;
    if (!text) {
      el.classList.remove('on');
      return;
    }
    el.textContent = text;
    el.classList.add('on');
  }

  /** 0..1 confidence; label from the lamp ladder. */
  lamp(level: number) {
    const idx = Math.min(copy.lamp.length - 1, Math.floor(level * (copy.lamp.length - 1) + 0.001));
    document.getElementById('lamp-label')!.textContent = copy.lamp[idx];
    const root = document.documentElement;
    root.style.setProperty('--lampSat', String(0.2 + level * 0.8));
    root.style.setProperty('--lampBright', String(0.45 + level * 0.6));
    root.style.setProperty('--lampGlow', String(0.05 + level * 0.5));
  }

  /** Fact chip anchored near a screen point. */
  chip(kicker: string, text: string, x: number, y: number) {
    const el = document.getElementById('chip')!;
    el.innerHTML = `<span class="chip-kicker">${kicker}</span>${text}`;
    el.classList.add('on');
    const w = 340;
    el.style.left = `${Math.max(12, Math.min(innerWidth - w - 12, x - w / 2))}px`;
    el.style.top = `${Math.min(innerHeight - 160, y + 46)}px`;
  }

  hideChip() {
    document.getElementById('chip')!.classList.remove('on');
  }

  meaningCard(title: string, body: string, cta: string, onNext: () => void, kicker?: string) {
    const el = this.layer(
      'meaning',
      `<div class="card">${kicker ? `<div class="kicker">${kicker}</div>` : ''}
       <h2>${title}</h2><p>${body}</p>
       <button class="btn" id="next">${cta}</button></div>`,
    );
    el.querySelector('#next')!.addEventListener('click', () => {
      this.dismiss('meaning');
      onNext();
    });
  }

  baruchShem(he: string, tl: string, en: string, onDone: () => void) {
    const el = this.layer(
      'bshem',
      `<div id="bshem">
        <span class="he">${he}</span>
        <span class="tl">${tl}</span>
        <span class="en">${en}</span>
        <span class="why">${copy.baruchShem.caption}</span>
        <button class="btn ghost" id="on" style="margin-top:26px">Keep reading</button>
      </div>`,
    );
    el.querySelector('#on')!.addEventListener('click', () => {
      this.dismiss('bshem');
      onDone();
    });
  }

  quizChoice(
    stem: string,
    options: readonly string[],
    onPick: (i: number) => 'right' | 'wrong',
    feedback: { right: string; wrong: string },
    onDone: () => void,
  ) {
    const el = this.layer(
      'quiz',
      `<div class="card"><div class="kicker">${copy.quiz.intro}</div>
       <h2>${stem}</h2>
       <div class="quiz-opts">${options.map((o, i) => `<button data-i="${i}">${o}</button>`).join('')}</div>
       <p class="small" id="fb"></p></div>`,
    );
    const fb = el.querySelector<HTMLElement>('#fb')!;
    el.querySelectorAll<HTMLButtonElement>('.quiz-opts button').forEach((b) =>
      b.addEventListener('click', () => {
        const result = onPick(Number(b.dataset.i));
        if (result === 'right') {
          fb.textContent = feedback.right;
          fb.style.color = '#9fe09f';
          setTimeout(() => {
            this.dismiss('quiz');
            onDone();
          }, 1600);
        } else {
          fb.textContent = feedback.wrong;
          fb.style.color = '#e0b89f';
        }
      }),
    );
  }

  /** Tap-a-word quiz: no scrim, prompt floats while the scroll stays live. */
  quizTapPrompt(stem: string) {
    this.layer(
      'quiz-tap',
      `<div class="card" style="position:fixed;bottom:84px;left:50%;transform:translateX(-50%);
        padding:16px 26px;pointer-events:none">
        <div class="kicker">${copy.quiz.intro}</div><h2 style="margin:0">${stem}</h2>
        <p class="small" id="fb-tap"></p></div>`,
      false,
    ).classList.add('off');
  }

  quizTapFeedback(text: string, good: boolean) {
    const fb = document.getElementById('fb-tap');
    if (fb) {
      fb.textContent = text;
      (fb as HTMLElement).style.color = good ? '#9fe09f' : '#e0b89f';
    }
  }

  dismissQuizTap() {
    this.dismiss('quiz-tap');
  }

  celebration(daysLeft: number | null, onExplore: () => void, onShow: () => void) {
    const el = this.layer(
      'celebrate',
      `<div class="card">
        <h1 style="font-size:34px">${copy.celebration.title}</h1>
        <p>${copy.celebration.body}</p>
        ${daysLeft !== null ? `<p style="margin-top:14px;color:#d4a017;font-weight:600">${copy.celebration.countdown(daysLeft)}</p>` : ''}
        <button class="btn" id="explore">${copy.celebration.explore}</button><br/>
        <button class="btn ghost" id="show" style="margin-top:10px">${copy.celebration.show}</button>
        <p class="small">${copy.celebration.comeBack}</p>
      </div>`,
    );
    el.querySelector('#explore')!.addEventListener('click', () => {
      this.dismiss('celebrate');
      onExplore();
    });
    el.querySelector('#show')!.addEventListener('click', () => {
      this.dismiss('celebrate');
      onShow();
    });
  }
}
