import type { Disposable } from '../core/types';
import type { CubeEngine } from '../core/CubeEngine';
import { Renderer } from './Renderer';
import type { ModuleStateName } from '../state/CubeState';

/**
 * Drives the engine without React: owns a Renderer, the RAF loop and resize
 * handling. This is the reference host — the R3F binding is an alternative host
 * that reuses the exact same engine (Architecture §4 — one loop, host renders).
 */
export class StandaloneRuntime implements Disposable {
  private readonly renderer: Renderer;
  private readonly resizeObserver: ResizeObserver;
  private rafId = 0;
  private running = false;

  constructor(
    private readonly engine: CubeEngine,
    private readonly container: HTMLElement,
  ) {
    this.renderer = new Renderer(engine.theme.preset.exposure);
    container.appendChild(this.renderer.domElement);
    engine.attachRenderer(this.renderer.gl);
    engine.attachInteraction(this.renderer.domElement);

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
    this.renderer.domElement.remove();
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
