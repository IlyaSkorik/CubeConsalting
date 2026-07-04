import {
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  SRGBColorSpace,
  WebGLRenderer,
  type Camera,
  type Scene,
  type WebGLRendererParameters,
} from 'three';
import type { Disposable, Size } from '../core/types';

const DEFAULT_MAX_DPR = 2;

/**
 * Applies CUB LAB's canonical color/tone-mapping/shadow settings to ANY renderer.
 * Shared by the standalone Renderer below and by the R3F <Canvas>, so the two
 * rendering paths look identical and settings live in exactly one place
 * (Architecture §4 — renderer settings carried over from current code).
 */
export function configureRenderer(gl: WebGLRenderer, exposure: number): void {
  gl.outputColorSpace = SRGBColorSpace;
  gl.toneMapping = ACESFilmicToneMapping;
  gl.toneMappingExposure = exposure;
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = PCFSoftShadowMap;
}

/** Standalone WebGL renderer for non-React usage. R3F provides its own; see react/. */
export class Renderer implements Disposable {
  readonly gl: WebGLRenderer;
  private maxPixelRatio = DEFAULT_MAX_DPR;

  constructor(exposure: number, params: WebGLRendererParameters = {}) {
    this.gl = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', ...params });
    configureRenderer(this.gl, exposure);
  }

  get domElement(): HTMLCanvasElement {
    return this.gl.domElement;
  }

  setMaxPixelRatio(value: number): void {
    this.maxPixelRatio = value;
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio, value));
  }

  setSize({ width, height }: Size): void {
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio, this.maxPixelRatio));
    this.gl.setSize(width, height, false);
  }

  render(scene: Scene, camera: Camera): void {
    this.gl.render(scene, camera);
  }

  dispose(): void {
    this.gl.dispose();
  }
}
