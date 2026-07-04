import type { Disposable } from '../core/types';
import type { CubeEngine } from '../core/CubeEngine';
import { Renderer } from './Renderer';
import type { ModuleStateName } from '../state/CubeState';

/**
 * Drives the engine without React: owns a Renderer, the RAF loop and resize
 * handling. This is the reference host — the R3F binding is an alternative host
 * that reuses the exact same engine (Architecture §4 — one loop, host renders).
 */
export interface StandaloneRuntimeOptions {
  /** Render into an existing canvas instead of creating and appending one. */
  canvas?: HTMLCanvasElement;
  /** Element to read pointer/hover from (defaults to the canvas). Use when the
   *  canvas is pointer-events:none, e.g. a background overlay. */
  interactionTarget?: HTMLElement;
}

export class StandaloneRuntime implements Disposable {
  private readonly renderer: Renderer;
  private readonly resizeObserver: ResizeObserver;
  private readonly ownsCanvas: boolean;
  private rafId = 0;
  private running = false;

  constructor(
    private readonly engine: CubeEngine,
    private readonly container: HTMLElement,
    options: StandaloneRuntimeOptions = {},
  ) {
    this.ownsCanvas = !options.canvas;
    this.renderer = new Renderer(
      engine.theme.preset.exposure,
      options.canvas ? { canvas: options.canvas } : {},
    );
    if (this.ownsCanvas) container.appendChild(this.renderer.domElement);
    engine.attachRenderer(this.renderer.gl);
    engine.attachInteraction(options.interactionTarget ?? this.renderer.domElement);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  start(initial: ModuleStateName = 'idle'): void {
    if (this.running) return;
    this.running = true;
    this.engine.start(initial);
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.engine.clock.stop();
  }

  dispose(): void {
    this.stop();
    this.resizeObserver.disconnect();
    if (this.ownsCanvas) this.renderer.domElement.remove();
    this.renderer.dispose();
    this.engine.dispose();
  }

  private readonly loop = (): void => {
    if (!this.running) return;
    this.engine.frame();
    this.renderer.render(this.engine.scene, this.engine.camera);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.renderer.setSize({ width, height });
    this.engine.setSize(width, height);
  }
}
