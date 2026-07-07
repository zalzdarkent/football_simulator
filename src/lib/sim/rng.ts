// Seeded PRNG (mulberry32)
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type RNG = () => number;

export const randSeed = () => Math.floor(Math.random() * 2 ** 31);

export function pick<T>(arr: readonly T[], rng: RNG): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function chance(p: number, rng: RNG) {
  return rng() < p;
}

export function range(min: number, max: number, rng: RNG) {
  return min + Math.floor(rng() * (max - min + 1));
}

// Weighted pick
export function weighted<T>(items: Array<{ v: T; w: number }>, rng: RNG): T {
  const total = items.reduce((s, x) => s + x.w, 0);
  let r = rng() * total;
  for (const it of items) {
    r -= it.w;
    if (r <= 0) return it.v;
  }
  return items[items.length - 1].v;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
