import { chance, pick, range, uid, weighted, mulberry32, type RNG } from "./rng";
import type { MatchSpinResult, NewsItem, Position, Save, SocialPost } from "./types";
import { CLUBS, clubById, clubsByLeague, type Club } from "../../data/clubs";
import { NEWS, SOCIAL } from "../../data/templates";

const tpl = (arr: string[], rng: RNG, vars: Record<string, string | number>) => {
  let s = pick(arr, rng);
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
};

function pickOpponent(save: Save, rng?: RNG): Club {
  const club = clubById(save.currentClub.clubId)!;
  const opponents = clubsByLeague(club.league).filter((c) => c.id !== club.id);
  
  if (opponents.length === 0) return club;
  
  // Calculate which cycle of the league schedule we're in
  const cycle = Math.floor(save.season.matchday / opponents.length);
  const indexInCycle = save.season.matchday % opponents.length;
  
  // Use a predictable seed for this cycle so the shuffle is consistent
  // across previews and actual rolls
  const str = save.id + "-" + save.season.index + "-" + cycle;
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  const cycleRng = mulberry32(hash);
  
  // Shuffle opponents deterministically for this cycle
  const shuffled = [...opponents];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(cycleRng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled[indexInCycle];
}

// probability of scoring per match by position
const GOAL_BASE: Record<Position, number> = {
  GK: 0.005, CB: 0.05, LB: 0.06, RB: 0.06, CDM: 0.1,
  CM: 0.18, CAM: 0.35, LW: 0.4, RW: 0.4, ST: 0.55,
};
const ASSIST_BASE: Record<Position, number> = {
  GK: 0.005, CB: 0.03, LB: 0.15, RB: 0.15, CDM: 0.15,
  CM: 0.3, CAM: 0.5, LW: 0.4, RW: 0.4, ST: 0.25,
};

export function rollMatch(save: Save, rng: RNG): { result: MatchSpinResult; news: NewsItem; social?: SocialPost } {
  const str = save.id + save.season.index + save.season.matchday;
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  const fixedRng = mulberry32(hash);

  const club = clubById(save.currentClub.clubId)!;
  const opp = pickOpponent(save, fixedRng);
  const home = chance(0.5, fixedRng);
  const pos = save.player.position;
  const ovr = save.attributes.overall;

  // selection: overall vs club tier
  const startProb = Math.min(0.95, 0.4 + (ovr - (100 - club.tier * 12)) / 40);
  let selection: MatchSpinResult["selection"];
  const rSel = rng();
  if (save.suspendedMatches && save.suspendedMatches > 0) selection = "suspended";
  else if (save.injuredMatches && save.injuredMatches > 0) selection = "injured";
  else if (rSel < 0.03) selection = "injured";
  else if (rSel < startProb) selection = "starter";
  else if (rSel < startProb + 0.2) selection = "sub";
  else selection = "benched";

  if (selection === "benched" || selection === "injured" || selection === "suspended") {
    const teamRoll = rng();
    const strengthDiff = (club.reputation - opp.reputation) / 100;
    const winP = 0.35 + strengthDiff * 0.35 + (home ? 0.08 : -0.02);
    const drawP = 0.28;
    const tr: "W" | "D" | "L" = teamRoll < winP ? "W" : teamRoll < winP + drawP ? "D" : "L";
    const gf = tr === "W" ? range(1, 3, rng) : tr === "D" ? range(0, 2, rng) : range(0, 1, rng);
    const ga = tr === "L" ? range(1, 3, rng) : tr === "D" ? gf : range(0, gf - 1, rng);
    const result: MatchSpinResult = {
      opponentClubId: opp.id, home, selection,
      minutes: 0, goals: 0, assists: 0, yellow: false, red: false,
      cleanSheet: ga === 0, rating: 0, teamResult: tr,
      goalsFor: gf, goalsAgainst: Math.max(0, ga),
      motm: false,
      injuryMatches: selection === "injured" ? range(1, 4, rng) : 0,
    };
    const key = selection === "suspended" ? "suspended" : selection === "injured" ? "injury" : "benched";
    const news = mkNews(save, result, key, rng);
    return { result, news };
  }

  const minutes = selection === "starter" ? range(70, 90, rng) : range(15, 40, rng);
  const strengthDiff = (club.reputation - opp.reputation) / 100;
  const winP = 0.35 + strengthDiff * 0.35 + (home ? 0.08 : -0.02);
  const drawP = 0.28;
  const teamRoll = rng();
  const teamResult: "W" | "D" | "L" = teamRoll < winP ? "W" : teamRoll < winP + drawP ? "D" : "L";

  // performance modifier
  const perfMod = (ovr - 70) / 40 + (selection === "starter" ? 0 : -0.3);
  const goalP = Math.max(0, GOAL_BASE[pos] * (1 + perfMod)) * (minutes / 90);
  const assistP = Math.max(0, ASSIST_BASE[pos] * (1 + perfMod)) * (minutes / 90);

  let goals = 0;
  // model up to 3 shots-on-target moments
  for (let i = 0; i < 4; i++) if (chance(goalP / 2, rng)) goals++;
  let assists = 0;
  for (let i = 0; i < 3; i++) if (chance(assistP / 2, rng)) assists++;

  // if team lost badly, reduce; if team won by many and this player didn't score, add assist chance
  if (teamResult === "L") { goals = Math.max(0, goals - (chance(0.4, rng) ? 1 : 0)); }

  const yellow = chance(0.14, rng);
  const red = chance(0.02, rng);

  let gf: number, ga: number;
  if (teamResult === "W") { gf = Math.max(goals + assists, range(1, 3, rng)); ga = range(0, Math.max(0, gf - 1), rng); }
  else if (teamResult === "D") { gf = range(0, 2, rng); ga = gf; goals = Math.min(goals, gf); }
  else { gf = range(0, 1, rng); ga = range(gf + 1, gf + 3, rng); goals = Math.min(goals, gf); }
  const cleanSheet = ga === 0 && (pos === "GK" || pos === "CB" || pos === "LB" || pos === "RB" || pos === "CDM");

  // rating
  let rating = 6.4 + (ovr - 70) * 0.015;
  rating += goals * 0.8 + assists * 0.5;
  if (teamResult === "W") rating += 0.3;
  if (teamResult === "L") rating -= 0.4;
  if (red) rating -= 1.5;
  if (yellow) rating -= 0.1;
  if (cleanSheet) rating += 0.3;
  rating += (rng() - 0.5) * 0.8;
  rating = Math.max(3, Math.min(10, +rating.toFixed(1)));

  const motm = rating >= 8.5 && (goals + assists) >= 1;
  const injuryMatches = chance(0.04, rng) ? range(1, 5, rng) : 0;

  const result: MatchSpinResult = {
    opponentClubId: opp.id, home, selection,
    minutes, goals, assists, yellow, red, cleanSheet,
    rating, teamResult, goalsFor: gf, goalsAgainst: ga, motm, injuryMatches,
  };

  const newsKey =
    red ? "card_red" :
    teamResult === "L" ? "loss" :
    teamResult === "D" ? "draw" :
    teamResult === "W" ? (goals >= 3 ? "hattrick" : goals === 2 ? "brace" : goals === 1 ? "goal" : assists >= 2 ? "assist" : "win") :
    motm ? "motm" : "draw";

  const news = mkNews(save, result, newsKey, rng);

  let social: SocialPost | undefined;
  const wantsPost = goals > 0 || motm || teamResult === "L" || chance(0.15, rng);
  if (wantsPost) {
    const socialKey =
      goals >= 3 ? "hattrick" :
      goals > 0 ? "win_goal" :
      teamResult === "W" ? "win" :
      teamResult === "L" ? "loss" : "draw";
    social = {
      id: uid(),
      season: save.season.index,
      matchday: save.season.matchday + 1,
      content: tpl(SOCIAL[socialKey as keyof typeof SOCIAL] as string[], rng, {
        goals, club: club.name,
      }),
      likes: range(500, 5000, rng) + goals * range(1000, 4000, rng) + (motm ? 3000 : 0),
      comments: range(50, 400, rng) + goals * 200,
      reposts: range(30, 200, rng) + goals * 100,
    };
  }

  return { result, news, social };
}

function mkNews(save: Save, r: MatchSpinResult, key: keyof typeof NEWS, rng: RNG): NewsItem {
  const club = clubById(save.currentClub.clubId)!;
  const opp = clubById(r.opponentClubId)!;
  return {
    id: uid(),
    season: save.season.index,
    matchday: save.season.matchday + 1,
    tag: key === "suspended" ? "suspended" : key === "injury" ? "injury" : "match",
    title: tpl(NEWS[key], rng, {
      player: save.player.name, club: club.name, opp: opp.name,
      goals: r.goals, assists: r.assists, rating: r.rating,
    }),
    body: `${club.short} ${r.goalsFor}-${r.goalsAgainst} ${opp.short} • Musim ${save.season.index}, Pekan ${save.season.matchday + 1}`,
  };
}

// Fixture generation for preview UI: pick opponent deterministically? We use rng.
export function previewOpponent(save: Save, rng: RNG): Club {
  const str = save.id + save.season.index + save.season.matchday;
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  const fixedRng = mulberry32(hash);
  return pickOpponent(save, fixedRng);
}

export function _unusedWeighted() { return weighted; }
