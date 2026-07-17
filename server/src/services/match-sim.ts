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
  // Offset performa musiman (dari calcTeamStrength), opsional — kalau nggak dikasih,
  // dianggap 0 (klub main sesuai reputation dasarnya, tanpa bumbu form musiman).
  clubStrength?: number;
  oppStrength?: number;
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

// Sigmoid: memetakan selisih kekuatan (roughly -1..1) ke peluang 0..1 dengan kurva halus,
// jadi gap besar (klub top vs klub kecil) bisa dominan tanpa peluang jadi negatif/di atas 1.
function sigmoid(x: number, k: number): number {
  return 1 / (1 + Math.exp(-x * k));
}
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// Variasi performa musiman per klub: deterministic berdasarkan (save, klub, musim),
// jadi klub yang sama akan konsisten "lagi on-fire" atau "lagi jeblok" di seluruh
// pertandingan dalam satu musim itu — bukan diroll ulang tiap match.
// Rentang offset: -7..+7, ditambahkan ke reputation dasar klub sebelum dihitung strengthDiff.
export function calcTeamStrength(clubId: string, saveSeed: number, seasonIdx: number): number {
  const rng = rngFor(saveSeed, "team-strength", clubId, seasonIdx);
  return (rng() - 0.5) * 14;
}

export function simulateMatch(input: MatchInput, rng: RNG): MatchOutput {
  const { overall: ovr, position: pos, club, opponent: opp, home, competition } = input;

  const expectedOvr = 50 + (club.reputation - 50) * 0.6;
  const startProb = Math.min(0.95, Math.max(0.05, 0.4 + (ovr - expectedOvr) / 10));
  let selection: MatchOutput["selection"];
  const rSel = rng();
  if (input.suspendedMatches && input.suspendedMatches > 0) selection = "suspended";
  else if (input.injuredMatches && input.injuredMatches > 0) selection = "injured";
  else if (rSel < 0.03) selection = "injured";
  else if (rSel < startProb) selection = "starter";
  else if (rSel < startProb + 0.2) selection = "sub";
  else selection = "benched";

  // Reputation dasar klub, disesuaikan sama form musiman (kalau dikasih lewat calcTeamStrength).
  const clubSeasonRating = club.reputation + (input.clubStrength ?? 0);
  const oppSeasonRating = opp.reputation + (input.oppStrength ?? 0);

  // Kontribusi kamu ke kekuatan klub: kalau starter, klub "dianggap" sedikit lebih kuat/lemah
  // dari reputation dasarnya tergantung overall kamu dibanding reputation klub sendiri.
  // Bobotnya kecil (satu pemain dari 11) tapi nyata — biar starman beneran ngefek ke hasil tim.
  const squadWeight = selection === "starter" ? 0.16 : selection === "sub" ? 0.07 : 0;
  const effectiveClubRating = clubSeasonRating + (ovr - clubSeasonRating) * squadWeight;

  const strengthDiff = (effectiveClubRating - oppSeasonRating) / 100;
  // Competition difficulty boost: continental & cup finals harder
  const compBoost = (competition.tier_boost ?? 0);
  const homeAdv = home ? 0.06 : -0.03;

  // Performa kamu di laga ini dihitung DULU, sebelum hasil tim diputuskan — supaya
  // gol/assist kamu betulan mendorong peluang menang tim, bukan cuma "dicocok-cocokin" belakangan.
  const minutes = selection === "starter" ? range(70, 90, rng)
    : selection === "sub" ? range(15, 40, rng) : 0;
  const perfMod = (ovr - 70) / 40 + (selection === "starter" ? 0 : -0.3);
  const goalP = Math.max(0, GOAL_BASE[pos] * (1 + perfMod)) * (minutes / 90);
  const assistP = Math.max(0, ASSIST_BASE[pos] * (1 + perfMod)) * (minutes / 90);

  let goals = 0;
  let assists = 0;
  if (selection === "starter" || selection === "sub") {
    for (let i = 0; i < 4; i++) if (chance(goalP / 2, rng)) goals++;
    for (let i = 0; i < 3; i++) if (chance(assistP / 2, rng)) assists++;
  }

  // Nudge peluang menang berdasarkan kontribusi nyata kamu di laga ini (gol/assist),
  // dibatasi biar nggak jadi satu-satunya faktor penentu.
  const performanceNudge = Math.min(0.12, goals * 0.05 + assists * 0.025);

  const winP = clamp(sigmoid(strengthDiff, 2.2) + performanceNudge + homeAdv - compBoost * 0.12, 0.05, 0.9);
  const drawBase = 0.27 - Math.abs(strengthDiff) * 0.08; // makin timpang kekuatannya, makin jarang seri
  const drawP = clamp(drawBase, 0.14, 0.28);
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

  const yellow = chance(0.14, rng);
  const red = chance(0.02, rng);

  // Skor tim dibangun MENGIKUTI performa kamu (bukan sebaliknya) — gol/assist kamu
  // nggak pernah dipotong cuma biar "pas" sama hasil tim yang sudah ditentukan duluan.
  const contribution = goals + assists;
  let gf: number, ga: number;
  if (tr === "W") { gf = Math.max(contribution, range(1, 3, rng)); ga = range(0, Math.max(0, gf - 1), rng); }
  else if (tr === "D") { gf = Math.max(contribution, range(0, 2, rng)); ga = gf; }
  else { gf = Math.max(contribution, range(0, 1, rng)); ga = range(gf + 1, gf + 3, rng); }

  const cleanSheet = ga === 0 && ["GK", "CB", "LB", "RB", "CDM"].includes(pos);
  const saves = pos === "GK" ? range(2, 8, rng) + (cleanSheet ? range(0, 3, rng) : 0) : 0;

  let rating = 6.5 + (ovr - 60) * 0.025;
  rating += goals * 1.4 + assists * 0.6;
  if (tr === "W") rating += 0.5;
  if (tr === "L") rating -= 0.2;
  if (red) rating -= 1.5;
  if (yellow) rating -= 0.1;
  if (cleanSheet) rating += 0.3;
  if (pos === "GK") rating += (saves - 4) * 0.05;
  rating += (rng() - 0.5) * 0.4;
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