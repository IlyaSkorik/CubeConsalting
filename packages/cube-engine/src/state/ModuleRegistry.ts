import type { EventBus } from '../core/EventBus';
import type { EngineEventMap } from '../core/EngineEvents';
import type { CubeModule } from './CubeModule';
import type { ModuleStateName } from './CubeState';

/**
 * The extension point of the engine. New cube behaviors register here at runtime;
 * no existing code changes (Stage 2 "Future modules must be registerable without
 * modifying existing code").
 */
export class ModuleRegistry {
  private readonly modules = new Map<ModuleStateName, CubeModule>();

  constructor(private readonly events: EventBus<EngineEventMap>) {}

  register(module: CubeModule): this {
    this.modules.set(module.id, module);
    this.events.emit('MODULE_REGISTERED', { id: module.id });
    return this;
  }

  remove(id: ModuleStateName): void {
    if (this.modules.delete(id)) {
      this.events.emit('MODULE_REMOVED', { id });
    }
  }

  get(id: ModuleStateName): CubeModule | undefined {
    return this.modules.get(id);
  }

  has(id: ModuleStateName): boolean {
    return this.modules.has(id);
  }

  get ids(): ModuleStateName[] {
    return [...this.modules.keys()];
  }
}
