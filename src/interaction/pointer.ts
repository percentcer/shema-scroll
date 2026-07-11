import { Raycaster, Vector2, type Camera, type Mesh } from 'three/webgpu';
import type { BakedWord } from '../text/bake';
import type { WordIndex } from '../text/wordIndex';

export interface PointerTarget {
  mesh: Mesh;
  index: WordIndex;
  /** Paragraph id this column carries. */
  pid: string;
}

export interface PointerEvents {
  wordenter: { word: BakedWord; uv: { u: number; v: number }; pid: string };
  wordleave: { word: BakedWord; pid: string };
  wordhold: { word: BakedWord; pid: string };
  /** Pointer is on the parchment (word or not). */
  surfacemove: {
    uv: { u: number; v: number };
    point: { x: number; y: number; z: number };
    pid: string;
  };
  surfaceleave: Record<string, never>;
}

const HOLD_MS = 350;

/**
 * pointer → NDC → raycast against the column meshes → uv → word events.
 * Touch and mouse share one path (Pointer Events).
 */
export class ScrollPointer extends EventTarget {
  private raycaster = new Raycaster();
  private ndc = new Vector2();
  private current: { word: BakedWord; pid: string } | null = null;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private onSurface = false;
  private meshes: Mesh[];
  private byMesh: Map<Mesh, PointerTarget>;

  constructor(
    private dom: HTMLElement,
    private camera: Camera,
    targets: PointerTarget[],
  ) {
    super();
    this.meshes = targets.map((t) => t.mesh);
    this.byMesh = new Map(targets.map((t) => [t.mesh, t]));
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
    const hit = this.raycaster.intersectObjects(this.meshes, false)[0];
    const target = hit && this.byMesh.get(hit.object as Mesh);
    if (!hit?.uv || !target) {
      this.clear();
      return;
    }

    const uv = { u: hit.uv.x, v: hit.uv.y };
    this.onSurface = true;
    this.emit('surfacemove', {
      uv,
      point: { x: hit.point.x, y: hit.point.y, z: hit.point.z },
      pid: target.pid,
    });

    const word = target.index.lookup(uv.u, uv.v);
    if (word?.id !== this.current?.word.id) {
      if (this.current) this.emit('wordleave', this.current);
      if (this.holdTimer) clearTimeout(this.holdTimer);
      this.current = word ? { word, pid: target.pid } : null;
      if (word) {
        this.emit('wordenter', { word, uv, pid: target.pid });
        this.holdTimer = setTimeout(
          () => this.emit('wordhold', { word, pid: target.pid }),
          HOLD_MS,
        );
      }
    }
  };

  private clear() {
    if (this.current) this.emit('wordleave', this.current);
    if (this.holdTimer) clearTimeout(this.holdTimer);
    this.current = null;
    if (this.onSurface) {
      this.onSurface = false;
      this.emit('surfaceleave', {});
    }
  }
}
