import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardNodeMaterial,
  SphereGeometry,
} from 'three/webgpu';

/**
 * The atzei chayim ("trees of life") — the wooden rollers a Torah scroll is
 * wound onto. One at each side edge of the parchment.
 */
export function createRollers(columnWidth: number, columnHeight: number): Group {
  const group = new Group();
  const wood = new MeshStandardNodeMaterial({ color: '#3a2416', roughness: 0.55, metalness: 0 });
  const woodDark = new MeshStandardNodeMaterial({ color: '#241608', roughness: 0.6, metalness: 0 });

  const rodLen = columnHeight * 1.32;
  const rodR = 0.028;

  for (const side of [-1, 1]) {
    const x = side * (columnWidth / 2 + rodR * 0.4);

    const rod = new Mesh(new CylinderGeometry(rodR, rodR, rodLen, 28), wood);
    rod.position.set(x, 0, -0.075);

    // Rolled-up parchment turns hugging the rod.
    const wrap = new Mesh(
      new CylinderGeometry(rodR * 2.1, rodR * 2.1, columnHeight * 0.995, 36),
      new MeshStandardNodeMaterial({ color: '#d8c49a', roughness: 0.9 }),
    );
    wrap.position.set(x, 0, -0.075);

    // Flange discs above/below the parchment + handle knobs at the ends.
    for (const end of [-1, 1]) {
      const flange = new Mesh(new CylinderGeometry(rodR * 3.1, rodR * 3.1, 0.018, 32), woodDark);
      flange.position.set(x, end * (columnHeight / 2 + 0.035), -0.075);
      const handle = new Mesh(new CylinderGeometry(rodR * 0.75, rodR * 1.05, rodLen * 0.09, 20), wood);
      handle.position.set(x, end * (rodLen / 2 - rodLen * 0.045), -0.075);
      const knob = new Mesh(new SphereGeometry(rodR * 1.25, 20, 14), woodDark);
      knob.position.set(x, end * (rodLen / 2), -0.075);
      group.add(flange, handle, knob);
    }
    group.add(rod, wrap);
  }
  return group;
}
