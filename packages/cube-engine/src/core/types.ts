/** Cross-cutting primitive types shared by every engine system. */

export type Theme = 'dark' | 'light';

export type QualityTier = 'low' | 'medium' | 'high' | 'ultra';

/** A system that advances on the single engine render loop (Architecture §4). */
export interface Updatable {
  update(delta: number, elapsed: number): void;
}

/** A system that owns GPU/DOM resources and must release them explicitly (§13 memory cleanup). */
export interface Disposable {
  dispose(): void;
}

/** Normalized 2D pointer in [-1, 1] range, origin at viewport center. */
export interface NormalizedPointer {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}
