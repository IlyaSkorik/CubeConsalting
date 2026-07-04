/** Deterministic pseudo-random in [0,1) from an integer. No Math.random ⇒ reproducible layouts. */
export function hash01(n: number): number {
  let x = (n + 1) * 374761393;
  x = (x ^ (x >>> 13)) * 1274126177;
  x = x ^ (x >>> 16);
  return (x >>> 0) / 4294967296;
}

/** Two independent hashed values for the same seed. */
export function hash2(n: number): [number, number] {
  return [hash01(n), hash01(n * 2654435761 + 101)];
}
