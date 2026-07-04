import { BREATHING } from '../config/tokens';
import type { EventBus } from '../core/EventBus';
import type { EngineEventMap } from '../core/EngineEvents';
import type { Disposable, NormalizedPointer } from '../core/types';

/**
 * Normalizes raw DOM input (mouse, touch, keyboard, focus) into engine events.
 * Pure abstraction — it contains NO UI logic and knows nothing about the cube
 * (Stage 2 "Only interaction abstraction"). Tracks inactivity to drive the cube's
 * introspective mode (Creative §3).
 */
export class InteractionEngine implements Disposable {
  private element: HTMLElement | null = null;
  private readonly pointer: NormalizedPointer = { x: 0, y: 0 };
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private isIdle = false;

  constructor(
    private readonly events: EventBus<EngineEventMap>,
    private readonly idleMs: number = BREATHING.inactivityThresholdMs,
  ) {}

  get currentPointer(): NormalizedPointer {
    return this.pointer;
  }

  attach(element: HTMLElement): void {
    this.detach();
    this.element = element;
    element.addEventListener('pointermove', this.onPointerMove, { passive: true });
    element.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    element.addEventListener('pointerup', this.onPointerUp, { passive: true });
    element.addEventListener('pointerenter', this.onPointerEnter, { passive: true });
    element.addEventListener('pointerleave', this.onPointerLeave, { passive: true });
    element.addEventListener('click', this.onClick, { passive: true });
    element.addEventListener('focusin', this.onFocusIn);
    element.addEventListener('focusout', this.onFocusOut);
    window.addEventListener('keydown', this.onKeyDown, { passive: true });
    this.resetIdle();
  }

  detach(): void {
    const element = this.element;
    if (!element) return;
    element.removeEventListener('pointermove', this.onPointerMove);
    element.removeEventListener('pointerdown', this.onPointerDown);
    element.removeEventListener('pointerup', this.onPointerUp);
    element.removeEventListener('pointerenter', this.onPointerEnter);
    element.removeEventListener('pointerleave', this.onPointerLeave);
    element.removeEventListener('click', this.onClick);
    element.removeEventListener('focusin', this.onFocusIn);
    element.removeEventListener('focusout', this.onFocusOut);
    window.removeEventListener('keydown', this.onKeyDown);
    this.clearIdleTimer();
    this.element = null;
  }

  dispose(): void {
    this.detach();
  }

  private normalize(event: PointerEvent): void {
    if (!this.element) return;
    const rect = this.element.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.normalize(event);
    this.events.emit('POINTER_MOVE', { pointer: { ...this.pointer } });
    this.resetIdle();
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.normalize(event);
    this.events.emit('POINTER_DOWN', { pointer: { ...this.pointer } });
    this.resetIdle();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    this.normalize(event);
    this.events.emit('POINTER_UP', { pointer: { ...this.pointer } });
    this.resetIdle();
  };

  private readonly onPointerEnter = (): void => {
    this.events.emit('HOVER_START', {});
  };

  private readonly onPointerLeave = (): void => {
    this.events.emit('HOVER_END', {});
  };

  private readonly onClick = (event: PointerEvent): void => {
    this.normalize(event);
    this.events.emit('CLICK', { pointer: { ...this.pointer } });
    this.resetIdle();
  };

  private readonly onFocusIn = (event: FocusEvent): void => {
    this.events.emit('FOCUS', { target: (event.target as HTMLElement | null)?.id });
  };

  private readonly onFocusOut = (event: FocusEvent): void => {
    this.events.emit('BLUR', { target: (event.target as HTMLElement | null)?.id });
  };

  private readonly onKeyDown = (): void => {
    this.resetIdle();
  };

  private resetIdle(): void {
    if (this.isIdle) {
      this.isIdle = false;
      this.events.emit('IDLE_END', {});
    }
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      this.isIdle = true;
      this.events.emit('IDLE_START', {});
    }, this.idleMs);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }
}
