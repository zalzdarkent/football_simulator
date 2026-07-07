import type { Attributes, Position } from "./types";
import type { RNG } from "./rng";
import { range } from "./rng";

const POSITION_PROFILE: Record<Position, Partial<Attributes>> = {
  GK:  { pace: 45, shooting: 20, passing: 45, dribbling: 40, defending: 30, physical: 60, goalkeeping: 70 },
  CB:  { pace: 55, shooting: 35, passing: 55, dribbling: 50, defending: 72, physical: 72, goalkeeping: 10 },
  LB:  { pace: 70, shooting: 45, passing: 62, dribbling: 62, defending: 65, physical: 65, goalkeeping: 10 },
  RB:  { pace: 70, shooting: 45, passing: 62, dribbling: 62, defending: 65, physical: 65, goalkeeping: 10 },
  CDM: { pace: 58, shooting: 55, passing: 68, dribbling: 60, defending: 70, physical: 70, goalkeeping: 10 },
  CM:  { pace: 62, shooting: 60, passing: 72, dribbling: 68, defending: 60, physical: 65, goalkeeping: 10 },
  CAM: { pace: 66, shooting: 68, passing: 74, dribbling: 74, defending: 45, physical: 60, goalkeeping: 10 },
  LW:  { pace: 78, shooting: 68, passing: 65, dribbling: 76, defending: 40, physical: 60, goalkeeping: 10 },
  RW:  { pace: 78, shooting: 68, passing: 65, dribbling: 76, defending: 40, physical: 60, goalkeeping: 10 },
  ST:  { pace: 72, shooting: 78, passing: 55, dribbling: 68, defending: 30, physical: 68, goalkeeping: 10 },
};

export function genInitialAttributes(position: Position, age: number, rng: RNG): Attributes {
  const p = POSITION_PROFILE[position];
  const jitter = (base: number) => Math.max(30, Math.min(85, base + range(-8, 8, rng)));
  const attrs: Attributes = {
    overall: 0,
    potential: 0,
    pace: jitter(p.pace!),
    shooting: jitter(p.shooting!),
    passing: jitter(p.passing!),
    dribbling: jitter(p.dribbling!),
    defending: jitter(p.defending!),
    physical: jitter(p.physical!),
    goalkeeping: position === "GK" ? jitter(p.goalkeeping!) : jitter(p.goalkeeping!),
  };
  attrs.overall = computeOverall(attrs, position);
  // young players start low, high potential
  const ageMod = age <= 18 ? -6 : age <= 21 ? -3 : 0;
  attrs.overall = Math.max(50, attrs.overall + ageMod);
  attrs.potential = Math.min(94, attrs.overall + range(6, 20, rng));
  return attrs;
}

export function computeOverall(a: Attributes, pos: Position): number {
  const w = weightsFor(pos);
  const total =
    a.pace * w.pace +
    a.shooting * w.shooting +
    a.passing * w.passing +
    a.dribbling * w.dribbling +
    a.defending * w.defending +
    a.physical * w.physical +
    a.goalkeeping * w.gk;
  const sum = w.pace + w.shooting + w.passing + w.dribbling + w.defending + w.physical + w.gk;
  return Math.round(total / sum);
}

function weightsFor(pos: Position) {
  switch (pos) {
    case "GK":  return { pace: 0, shooting: 0, passing: 0.5, dribbling: 0, defending: 0.5, physical: 1, gk: 6 };
    case "CB":  return { pace: 1, shooting: 0, passing: 1, dribbling: 0.5, defending: 3, physical: 2.5, gk: 0 };
    case "LB":
    case "RB":  return { pace: 2, shooting: 0.5, passing: 1.5, dribbling: 1.5, defending: 2.5, physical: 2, gk: 0 };
    case "CDM": return { pace: 1, shooting: 1, passing: 2, dribbling: 1.5, defending: 2.5, physical: 2, gk: 0 };
    case "CM":  return { pace: 1, shooting: 1.5, passing: 2.5, dribbling: 2, defending: 1.5, physical: 1.5, gk: 0 };
    case "CAM": return { pace: 1.5, shooting: 2, passing: 2.5, dribbling: 2.5, defending: 0.5, physical: 1, gk: 0 };
    case "LW":
    case "RW":  return { pace: 2.5, shooting: 2, passing: 1.5, dribbling: 2.5, defending: 0.5, physical: 1, gk: 0 };
    case "ST":  return { pace: 2, shooting: 3, passing: 1, dribbling: 2, defending: 0, physical: 2, gk: 0 };
  }
}

// Age curve: growth until ~27, plateau until 30, decline after
export function ageAdjustment(age: number, potential: number, currentOverall: number, seasonPerf: number, rng: RNG): number {
  // seasonPerf: 0..2 (avg rating / avg goals per app). Center at 1.
  const perfMod = (seasonPerf - 1) * 2; // -2..+2
  if (age <= 26) {
    const gap = Math.max(0, potential - currentOverall);
    const base = gap > 0 ? Math.min(3, Math.round(1 + gap / 6)) : 0;
    return Math.max(0, base + Math.round(perfMod));
  }
  if (age <= 30) return Math.round(perfMod / 2);
  if (age <= 33) return -1 + Math.round(perfMod / 2);
  return -range(1, 3, rng) + Math.round(perfMod / 2);
}
