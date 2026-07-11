import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicNodeMaterial,
  MeshStandardNodeMaterial,
  PlaneGeometry,
  SphereGeometry,
  Vector3,
} from 'three/webgpu';

/**
 * The yad (Torah pointer) that follows the pointer with a hand-held feel:
 * frame-rate-independent damped lag plus a lean into its velocity.
 * Primitive-composed: tapered shaft, collar, cuff, pointing finger.
 */
export class Yad {
  readonly group = new Group();
  private target = new Vector3();
  private velocity = new Vector3();
  private prev = new Vector3();
  private shadow: Mesh;
  visible = false;

  constructor() {
    const silver = new MeshStandardNodeMaterial({
      color: '#c8c4bc',
      metalness: 0.9,
      roughness: 0.25,
    });

    const shaft = new Mesh(new CylinderGeometry(0.008, 0.013, 0.24, 24), silver);
    shaft.position.y = 0.17;

    const collar = new Mesh(new SphereGeometry(0.016, 24, 16), silver);
    collar.position.y = 0.06;

    const cuff = new Mesh(new BoxGeometry(0.022, 0.05, 0.02), silver);
    cuff.position.y = 0.028;

    const finger = new Mesh(new CylinderGeometry(0.005, 0.0035, 0.045, 16), silver);
    finger.position.y = 0.0;

    this.group.add(shaft, collar, cuff, finger);

    // Fake contact shadow: radial-gradient sprite hugging the parchment.
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(30,15,5,0.4)');
    grad.addColorStop(1, 'rgba(30,15,5,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    this.shadow = new Mesh(
      new PlaneGeometry(0.09, 0.09),
      new MeshBasicNodeMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false }),
    );
    this.group.add(this.shadow);

    // Rest pose: tilted like a hand holding it from the upper right.
    this.group.rotation.set(0.55, 0, -0.6);
    this.group.visible = false;
  }

  /** Point the yad tip at a world position (surface point + hover height). */
  setTarget(point: { x: number; y: number; z: number }, normal?: { x: number; y: number; z: number }) {
    const hover = 0.012;
    this.target.set(
      point.x + (normal?.x ?? 0) * hover,
      point.y + (normal?.y ?? 0) * hover,
      point.z + (normal?.z ?? 1) * hover,
    );
    if (!this.visible) {
      this.tipPos.copy(this.target);
      this.prev.copy(this.target);
      this.visible = true;
      this.group.visible = true;
    }
  }

  hide() {
    this.visible = false;
    this.group.visible = false;
  }

  private tipLocal = new Vector3(0, -0.0225, 0);
  private tipPos = new Vector3();

  update(dt: number) {
    if (!this.visible) return;
    const k = 1 - Math.exp(-dt * 9);
    this.tipPos.lerp(this.target, k);

    this.velocity.copy(this.tipPos).sub(this.prev).divideScalar(Math.max(dt, 1e-4));
    this.prev.copy(this.tipPos);

    // Lean into travel direction; settle back to rest pose.
    const leanX = Math.max(-0.25, Math.min(0.25, -this.velocity.y * 0.35));
    const leanZ = Math.max(-0.3, Math.min(0.3, -this.velocity.x * 0.35));
    this.group.rotation.x = 0.55 + leanX;
    this.group.rotation.z = -0.6 + leanZ;

    // Anchor the FINGER TIP (not the group origin) to the smoothed target.
    const tipOffset = this.tipLocal.clone().applyEuler(this.group.rotation);
    this.group.position.copy(this.tipPos).sub(tipOffset);

    // Shadow hugs the surface just below the tip, counter-rotated to lie flat.
    this.shadow.position.copy(this.tipLocal).add(new Vector3(0, -0.002, -0.004));
    this.shadow.rotation.set(-this.group.rotation.x, 0, -this.group.rotation.z);
  }
}
