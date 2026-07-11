import { PerspectiveCamera, Scene, WebGPURenderer } from 'three/webgpu';

export interface SceneContext {
  renderer: WebGPURenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  /** True when the WebGPU backend is active (false = WebGL2 fallback). */
  isWebGPU: boolean;
}

const MAX_PIXEL_RATIO = 2;

export async function createSceneContext(canvas: HTMLCanvasElement): Promise<SceneContext> {
  const params = new URLSearchParams(location.search);
  const forceWebGL = params.has('forceWebGL');

  const renderer = new WebGPURenderer({ canvas, antialias: true, forceWebGL });
  await renderer.init();

  const isWebGPU =
    (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend === true;
  const isCoarsePointer = matchMedia('(pointer: coarse)').matches;
  const pixelRatioCap = isWebGPU && !isCoarsePointer ? MAX_PIXEL_RATIO : 1.5;
  renderer.setPixelRatio(Math.min(devicePixelRatio, pixelRatioCap));
  renderer.setSize(innerWidth, innerHeight);

  const scene = new Scene();
  const camera = new PerspectiveCamera(38, innerWidth / innerHeight, 0.05, 50);
  camera.position.set(0, 0, 2.2);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  return { renderer, scene, camera, isWebGPU };
}
