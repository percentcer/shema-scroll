import { Vector3, type Camera } from 'three/webgpu';
import type { ShemaWord } from '../content/types';

/**
 * The learner strip: pointed Hebrew + transliteration + gloss, floating near
 * the yad. This is where vowels live (the scroll, authentically, has none).
 */
export class LearnerStrip {
  private el: HTMLDivElement;
  private heEl: HTMLSpanElement;
  private translitEl: HTMLSpanElement;
  private glossEl: HTMLSpanElement;
  private worldPos = new Vector3();
  private visible = false;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'learner-strip';
    this.el.innerHTML = `
      <style>
        #learner-strip {
          position: fixed; left: 0; top: 0; pointer-events: none;
          transform: translate(-50%, 24px);
          background: rgba(26, 18, 11, 0.92);
          border: 1px solid rgba(212, 160, 23, 0.35);
          border-radius: 12px; padding: 8px 16px 9px;
          display: flex; flex-direction: column; align-items: center; gap: 1px;
          opacity: 0; transition: opacity 0.15s ease;
          box-shadow: 0 4px 24px rgba(0,0,0,0.5);
          white-space: nowrap;
        }
        #learner-strip .he { font: 500 26px TaameyFrankCLM, serif; color: #f3e5c0; }
        #learner-strip .tl { font: 600 15px Rubik, system-ui; color: #d4a017; letter-spacing: 0.02em; }
        #learner-strip .gl { font: 400 13px Rubik, system-ui; color: #b8a888; }
      </style>
      <span class="he"></span><span class="tl"></span><span class="gl"></span>`;
    this.heEl = this.el.querySelector('.he')!;
    this.translitEl = this.el.querySelector('.tl')!;
    this.glossEl = this.el.querySelector('.gl')!;
    root.appendChild(this.el);
  }

  show(word: ShemaWord, anchor: { x: number; y: number; z: number }) {
    this.heEl.textContent = word.hePointed;
    this.translitEl.textContent = word.translit;
    this.glossEl.textContent = word.gloss ?? '';
    this.glossEl.style.display = word.gloss ? '' : 'none';
    this.worldPos.set(anchor.x, anchor.y, anchor.z);
    this.visible = true;
    this.el.style.opacity = '1';
  }

  hide() {
    this.visible = false;
    this.el.style.opacity = '0';
  }

  /** Re-project the anchor each frame (camera or surface may move). */
  update(camera: Camera) {
    if (!this.visible) return;
    const p = this.worldPos.clone().project(camera);
    const x = (p.x * 0.5 + 0.5) * innerWidth;
    const y = (-p.y * 0.5 + 0.5) * innerHeight;
    this.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, 26px)`;
  }
}
