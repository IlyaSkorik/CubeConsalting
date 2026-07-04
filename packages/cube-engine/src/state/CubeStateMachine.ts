import { DURATION } from '../config/tokens';
import type { EventBus } from '../core/EventBus';
import type { EngineEventMap } from '../core/EngineEvents';
import type { Updatable } from '../core/types';
import { StateMachine } from './StateMachine';
import type { ModuleRegistry } from './ModuleRegistry';
import type { CubeModule, ModuleContext } from './CubeModule';
import type { CubeStateName, ModuleStateName } from './CubeState';

/**
 * Drives which module the cube is currently expressing. While a transition blends
 * (the cube damps toward the new module's targets) the reported state is
 * 'transition'; once settled it reports the destination module (Creative §2, §5).
 */
export class CubeStateMachine implements Updatable {
  private readonly fsm: StateMachine<CubeStateName>;
  private activeModule: CubeModule | null = null;
  private settledState: ModuleStateName | null = null;
  private pendingState: ModuleStateName | null = null;
  private transitionTimer = 0;

  constructor(
    private readonly registry: ModuleRegistry,
    private readonly context: ModuleContext,
    events: EventBus<EngineEventMap>,
    private readonly transitionSeconds = DURATION.cinematic / 1000,
  ) {
    this.fsm = new StateMachine<CubeStateName>((from, to) => {
      events.emit('CUBE_STATE_CHANGED', { from, to });
    });
  }

  get state(): CubeStateName | null {
    return this.fsm.current;
  }

  get target(): ModuleStateName | null {
    return this.settledState;
  }

  get isTransitioning(): boolean {
    return this.transitionTimer > 0;
  }

  /** Request the cube become `state`. Emits a 'transition' phase, then settles. */
  transitionTo(state: ModuleStateName): boolean {
    if (state === this.settledState && !this.isTransitioning) return false;
    const module = this.registry.get(state);
    if (!module) throw new Error(`[cube-engine] No module registered for state "${state}"`);

    this.activeModule?.exit(this.context);
    this.activeModule = module;
    module.enter(this.context);
    this.settledState = state;
    this.pendingState = state;
    this.transitionTimer = this.transitionSeconds;
    this.fsm.set('transition');
    return true;
  }

  update(delta: number, elapsed: number): void {
    if (this.transitionTimer > 0) {
      this.transitionTimer -= delta;
      if (this.transitionTimer <= 0 && this.pendingState) {
        this.fsm.set(this.pendingState);
        this.pendingState = null;
      }
    }
    this.activeModule?.update(delta, elapsed, this.context);
  }
}
