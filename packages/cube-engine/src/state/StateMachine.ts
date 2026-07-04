export interface StateHandler<S extends string> {
  onEnter?(from: S | null): void;
  onExit?(to: S): void;
}

export type StateChangeListener<S extends string> = (from: S | null, to: S) => void;

/**
 * Reusable, framework-agnostic finite state machine. Optional per-state guards
 * decide whether a transition is legal. Used by the cube today; reusable by any
 * future system (dashboard, onboarding flows) tomorrow.
 */
export class StateMachine<S extends string> {
  private readonly handlers = new Map<S, StateHandler<S>>();
  private readonly guards = new Map<S, Set<S>>();
  private _current: S | null = null;

  constructor(private readonly onChange?: StateChangeListener<S>) {}

  define(state: S, handler: StateHandler<S> = {}): this {
    this.handlers.set(state, handler);
    return this;
  }

  /** Restrict which states `from` may transition into. Absent = unrestricted. */
  allow(from: S, to: readonly S[]): this {
    this.guards.set(from, new Set(to));
    return this;
  }

  get current(): S | null {
    return this._current;
  }

  has(state: S): boolean {
    return this.handlers.has(state);
  }

  canTransition(to: S): boolean {
    if (this._current === null) return true;
    const allowed = this.guards.get(this._current);
    return allowed ? allowed.has(to) : true;
  }

  set(to: S): boolean {
    if (to === this._current || !this.canTransition(to)) return false;
    const from = this._current;
    this.handlers.get(from as S)?.onExit?.(to);
    this._current = to;
    this.handlers.get(to)?.onEnter?.(from);
    this.onChange?.(from, to);
    return true;
  }
}
