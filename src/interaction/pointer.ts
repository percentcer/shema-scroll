import { Raycaster, Vector2, type Camera, type Mesh } from 'three/webgpu';
import type { BakedWord } from '../text/bake';
import type { WordIndex } from '../text/wordIndex';

export interface PointerEvents {
  wordenter: { word: BakedWord; uv: { u: number; v: number } };
  wordleave: { word: BakedWord };
  wordhold: { word: BakedWord };
  /** Pointer is on the parchment (word or not). */
  surfacemove: { uv: { u: number; v: number }; point: { x: number; y: number; z: number } };
  surfaceleave: Record<string, never>;
}

const HOLD_MS = 350;

/**
 * pointer → NDC → raycast against the column mesh → uv → word events.
 * Touch and mouse share one path (Pointer Events).
 */
export class ScrollPointer extends EventTarget {
  private raycaster = new Raycaster();
  private ndc = new Vector2();
  private current: BakedWord | null = null;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private onSurface = false;

  constructor(
    private dom: HTMLElement,
    private camera: Camera,
    private mesh: Mesh,
    private index: WordIndex,
  ) {
    super();
    dom.addEventListener('pointermove', this.onPointer);
    dom.addEventListener('pointerdown', this.onPointer);
    dom.addEventListener('pointerleave', () => this.clear());
  }

  emit<K extends keyof PointerEvents>(type: K, detail: PointerEvents[K]) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  on<K extends keyof PointerEvents>(type: K, fn: (detail: PointerEvents[K]) => void) {
    this.addEventListener(type, (e) => fn((e as CustomEvent).detail));
    return this;
  }

  private onPointer = (e: PointerEvent) => {
    const rect = this.dom.getBoundingClientRect();
    this.ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.intersectObject(this.mesh, false)[0];
    if (!hit?.uv) {
      this.clear();
      return;
    }

    const uv = { u: hit.uv.x, v: hit.uv.y };
    this.onSurface = true;
    this.emit('surfacemove', { uv, point: { x: hit.point.x, y: hit.point.y, z: hit.point.z } });

    const word = this.index.lookup(uv.u, uv.v);
    if (word?.id !== this.current?.id) {
      if (this.current) this.emit('wordleave', { word: this.current });
      if (this.holdTimer) clearTimeout(this.holdTimer);
      this.current = word;
      if (word) {
        this.emit('wordenter', { word, uv });
        this.holdTimer = setTimeout(() => this.emit('wordhold', { word }), HOLD_MS);
      }
    }
  };

  private clear() {
    if (this.current) this.emit('wordleave', { word: this.current });
    if (this.holdTimer) clearTimeout(this.holdTimer);
    this.current = null;
    if (this.onSurface) {
      this.onSurface = false;
      this.emit('surfaceleave', {});
    }
  }
}
