import type { Disposable } from './types';

export type EventListener<T> = (payload: T) => void;

/**
 * Minimal, allocation-free, strongly-typed pub/sub.
 * Generic over an event map so `emit` and `on` are type-checked against payloads.
 */
export class EventBus<M extends object> implements Disposable {
  private readonly listeners = new Map<keyof M, Set<EventListener<unknown>>>();

  on<K extends keyof M>(type: K, listener: EventListener<M[K]>): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener as EventListener<unknown>);
    return () => this.off(type, listener);
  }

  once<K extends keyof M>(type: K, listener: EventListener<M[K]>): () => void {
    const off = this.on(type, (payload) => {
      off();
      listener(payload);
    });
    return off;
  }

  off<K extends keyof M>(type: K, listener: EventListener<M[K]>): void {
    this.listeners.get(type)?.delete(listener as EventListener<unknown>);
  }

  emit<K extends keyof M>(type: K, payload: M[K]): void {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const listener of set) {
      (listener as EventListener<M[K]>)(payload);
    }
  }

  dispose(): void {
    this.listeners.clear();
  }
}
