// Seeded PRNG helpers — deterministic across preview & commit.
export type RNG = () => number;

export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic RNG for a namespaced key derived from the save seed. */
export function rngFor(seed: number, ...parts: (string | number)[]): RNG {
  return mulberry32(hashStr(String(seed) + "|" + parts.join("|")));
}

export const range = (min: number, max: number, rng: RNG) =>
  Math.floor(rng() * (max - min + 1)) + min;
export const chance = (p: number, rng: RNG) => rng() < p;
export const pick = <T>(arr: T[], rng: RNG): T => arr[Math.floor(rng() * arr.length)];

export function shuffle<T>(arr: T[], rng: RNG): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
