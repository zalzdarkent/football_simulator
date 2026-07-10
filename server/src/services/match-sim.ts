// Match simulation — pure function, deterministic given seed inputs.
import { RNG, chance, range, rngFor } from "./rng.js";
import { ClubRow, CompRow } from "./reference-cache.js";

export type Position = "GK" | "CB" | "LB" | "RB" | "CDM" | "CM" | "CAM" | "LW" | "RW" | "ST";

const GOAL_BASE: Record<Position, number> = {
  GK: 0.005, CB: 0.05, LB: 0.06, RB: 0.06, CDM: 0.1,
  CM: 0.18, CAM: 0.35, LW: 0.4, RW: 0.4, ST: 0.55,
};
const ASSIST_BASE: Record<Position, number> = {
  GK: 0.005, CB: 0.03, LB: 0.15, RB: 0.15, CDM: 0.15,
  CM: 0.3, CAM: 0.5, LW: 0.4, RW: 0.4, ST: 0.25,
};

export type MatchInput = {
  overall: number;
  position: Position;
  age: number;
  club: ClubRow;
  opponent: ClubRow;
  home: boolean;
  competition: CompRow;
  suspendedMatches?: number;
  injuredMatches?: number;
};

export type MatchOutput = {
  selection: "starter" | "sub" | "benched" | "injured" | "suspended";
  minutes: number;
  goals: number;
  assists: number;
  saves: number;
  yellow: boolean;
  red: boolean;
  cleanSheet: boolean;
  rating: number;
  teamResult: "W" | "D" | "L";
  team_goals: number;
  opp_goals: number;
  motm: boolean;
  injuryMatches: number;
};

export function simulateMatch(input: MatchInput, rng: RNG): MatchOutput {
  const { overall: ovr, position: pos, club, opponent: opp, home, competition } = input;

  const startProb = Math.min(0.95, 0.4 + (ovr - (100 - club.tier * 12)) / 40);
  let selection: MatchOutput["selection"];
  const rSel = rng();
  if (input.suspendedMatches && input.suspendedMatches > 0) selection = "suspended";
  else if (input.injuredMatches && input.injuredMatches > 0) selection = "injured";
  else if (rSel < 0.03) selection = "injured";
  else if (rSel < startProb) selection = "starter";
  else if (rSel < startProb + 0.2) selection = "sub";
  else selection = "benched";

  const strengthDiff = (club.reputation - opp.reputation) / 100;
  // Competition difficulty boost: continental & cup finals harder
  const compBoost = (competition.tier_boost ?? 0);
  const winP = 0.35 + strengthDiff * 0.35 + (home ? 0.08 : -0.02) - compBoost * 0.15;
  const drawP = 0.28;
  const teamRoll = rng();
  const tr: "W" | "D" | "L" = teamRoll < winP ? "W" : teamRoll < winP + drawP ? "D" : "L";

  if (selection === "benched" || selection === "injured" || selection === "suspended") {
    const gf = tr === "W" ? range(1, 3, rng) : tr === "D" ? range(0, 2, rng) : range(0, 1, rng);
    const ga = tr === "L" ? range(1, 3, rng) : tr === "D" ? gf : range(0, Math.max(0, gf - 1), rng);
    return {
      selection, minutes: 0, goals: 0, assists: 0, saves: 0, yellow: false, red: false,
      cleanSheet: ga === 0, rating: 0, teamResult: tr, team_goals: gf, opp_goals: Math.max(0, ga),
      motm: false, injuryMatches: selection === "injured" ? range(1, 4, rng) : 0,
    };
  }

  const minutes = selection === "starter" ? range(70, 90, rng) : range(15, 40, rng);
  const perfMod = (ovr - 70) / 40 + (selection === "starter" ? 0 : -0.3);
  const goalP = Math.max(0, GOAL_BASE[pos] * (1 + perfMod)) * (minutes / 90);
  const assistP = Math.max(0, ASSIST_BASE[pos] * (1 + perfMod)) * (minutes / 90);

  let goals = 0;
  for (let i = 0; i < 4; i++) if (chance(goalP / 2, rng)) goals++;
  let assists = 0;
  for (let i = 0; i < 3; i++) if (chance(assistP / 2, rng)) assists++;
  if (tr === "L") goals = Math.max(0, goals - (chance(0.4, rng) ? 1 : 0));

  const yellow = chance(0.14, rng);
  const red = chance(0.02, rng);

  let gf: number, ga: number;
  if (tr === "W") { gf = Math.max(goals + assists, range(1, 3, rng)); ga = range(0, Math.max(0, gf - 1), rng); }
  else if (tr === "D") { gf = range(0, 2, rng); ga = gf; goals = Math.min(goals, gf); }
  else { gf = range(0, 1, rng); ga = range(gf + 1, gf + 3, rng); goals = Math.min(goals, gf); }

  const cleanSheet = ga === 0 && ["GK", "CB", "LB", "RB", "CDM"].includes(pos);
  const saves = pos === "GK" ? range(2, 8, rng) + (cleanSheet ? range(0, 3, rng) : 0) : 0;

  let rating = 6.4 + (ovr - 70) * 0.015;
  rating += goals * 0.8 + assists * 0.5;
  if (tr === "W") rating += 0.3;
  if (tr === "L") rating -= 0.4;
  if (red) rating -= 1.5;
  if (yellow) rating -= 0.1;
  if (cleanSheet) rating += 0.3;
  if (pos === "GK") rating += (saves - 4) * 0.05;
  rating += (rng() - 0.5) * 0.8;
  rating = Math.max(3, Math.min(10, +rating.toFixed(1)));

  const motm = rating >= 8.5 && (goals + assists + (cleanSheet && pos === "GK" ? 1 : 0)) >= 1;
  const injuryMatches = chance(0.04, rng) ? range(1, 5, rng) : 0;

  return {
    selection, minutes, goals, assists, saves, yellow, red, cleanSheet,
    rating, teamResult: tr, team_goals: gf, opp_goals: ga, motm, injuryMatches,
  };
}

/** Simulate with save-derived namespace RNG so preview == commit for same previewSeed. */
export function simulateMatchDeterministic(input: MatchInput, saveSeed: number, matchId: string, previewSeed?: number): MatchOutput {
  const rng = rngFor(saveSeed, "match", matchId, previewSeed ?? 0);
  return simulateMatch(input, rng);
}
