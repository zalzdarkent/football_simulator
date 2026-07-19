import { CLUBS, clubById, clubsByLeague } from "../data/clubs";
import { NEWS, SOCIAL } from "../data/templates";

type RNG = () => number;
type Position = "GK" | "CB" | "LB" | "RB" | "CDM" | "CM" | "CAM" | "LW" | "RW" | "ST";

interface MatchSpinResult {
  opponentClubId: string;
  home: boolean;
  selection: "starter" | "sub" | "benched" | "injured";
  minutes: number;
  goals: number;
  assists: number;
  yellow: boolean;
  red: boolean;
  cleanSheet: boolean;
  rating: number;
  teamResult: "W" | "D" | "L";
  goalsFor: number;
  goalsAgainst: number;
  motm: boolean;
  injuryMatches: number;
}

interface NewsItem {
  id: string;
  season: number;
  matchday: number;
  tag: string;
  title: string;
  body: string;
}

interface SocialPost {
  id: string;
  season: number;
  matchday: number;
  content: string;
  likes: number;
  comments: number;
  reposts: number;
}

interface Save {
  id: string;
  season: { index: number; matchday: number };
  currentClub: { clubId: string };
  player: { name: string; position: Position };
  attributes: { overall: number };
  news: NewsItem[];
}

// RNG utilities
function mulberry32(a: number): RNG {
  return () => {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function chance(p: number, rng: RNG): boolean {
  return rng() < p;
}

function range(min: number, max: number, rng: RNG): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(arr: T[], rng: RNG): T {
  return arr[Math.floor(rng() * arr.length)];
}

function uid(): string {
  return Math.random().toString(36).substring(2, 15);
}

const tpl = (arr: string[], rng: RNG, vars: Record<string, string | number>) => {
  let s = pick(arr, rng);
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
};

function pickOpponent(save: Save, rng: RNG) {
  const club = clubById(save.currentClub.clubId)!;
  const league = clubsByLeague(club.league).filter((c) => c.id !== club.id);
  
  // Get already played opponents from match history
  const playedOpponents = new Set<string>();
  for (const item of save.news) {
    if (item.tag === "match") {
      const oppMatch = item.body.match(/([A-Z]{3})\s+\d+-\d+\s+([A-Z]{3})/);
      if (oppMatch) {
        const oppShort = oppMatch[1] === club.short ? oppMatch[2] : oppMatch[1];
        const oppClub = league.find(c => c.short === oppShort);
        if (oppClub) playedOpponents.add(oppClub.id);
      }
    }
  }
  
  const availableOpponents = league.filter(c => !playedOpponents.has(c.id));
  
  if (availableOpponents.length === 0) {
    return pick(league, rng);
  }
  
  return pick(availableOpponents, rng);
}

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

  const startProb = Math.min(0.95, 0.4 + (ovr - (100 - club.tier * 12)) / 40);
  let selection: MatchSpinResult["selection"];
  const rSel = rng();
  if (rSel < 0.03) selection = "injured";
  else if (rSel < startProb) selection = "starter";
  else if (rSel < startProb + 0.2) selection = "sub";
  else selection = "benched";

  if (selection === "benched" || selection === "injured") {
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
    const key = selection === "injured" ? "injury" : "benched";
    const news = mkNews(save, result, key, rng, gf, Math.max(0, ga));
    return { result, news };
  }

  const minutes = selection === "starter" ? range(70, 90, rng) : range(15, 40, rng);
  const strengthDiff = (club.reputation - opp.reputation) / 100;
  const winP = 0.35 + strengthDiff * 0.35 + (home ? 0.08 : -0.02);
  const drawP = 0.28;
  const teamRoll = rng();
  const teamResult: "W" | "D" | "L" = teamRoll < winP ? "W" : teamRoll < winP + drawP ? "D" : "L";

  const perfMod = (ovr - 70) / 40 + (selection === "starter" ? 0 : -0.3);
  const goalP = Math.max(0, GOAL_BASE[pos] * (1 + perfMod)) * (minutes / 90);
  const assistP = Math.max(0, ASSIST_BASE[pos] * (1 + perfMod)) * (minutes / 90);

  let goals = 0;
  for (let i = 0; i < 4; i++) if (chance(goalP / 2, rng)) goals++;
  let assists = 0;
  for (let i = 0; i < 3; i++) if (chance(assistP / 2, rng)) assists++;

  if (teamResult === "L") { goals = Math.max(0, goals - (chance(0.4, rng) ? 1 : 0)); }

  const yellow = chance(0.14, rng);
  const red = chance(0.02, rng);

  let gf: number, ga: number;
  if (teamResult === "W") { gf = Math.max(goals + assists, range(1, 3, rng)); ga = range(0, Math.max(0, gf - 1), rng); }
  else if (teamResult === "D") { gf = range(0, 2, rng); ga = gf; goals = Math.min(goals, gf); }
  else { gf = range(0, 1, rng); ga = range(gf + 1, gf + 3, rng); goals = Math.min(goals, gf); }
  const cleanSheet = ga === 0 && (pos === "GK" || pos === "CB" || pos === "LB" || pos === "RB" || pos === "CDM");

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
    selection === "injured" ? "injury" :
    selection === "benched" ? "benched" :
    goals >= 3 ? "hattrick" :
    goals === 2 ? "brace" :
    goals === 1 ? "goal" :
    assists >= 2 ? "assist" :
    teamResult === "L" ? "loss" :
    teamResult === "D" ? "draw" :
    teamResult === "W" ? "win" :
    motm ? "motm" : "draw";

  const news = mkNews(save, result, newsKey, rng, gf, ga);

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

function mkNews(save: Save, r: MatchSpinResult, key: keyof typeof NEWS, rng: RNG, gf: number, ga: number): NewsItem {
  const club = clubById(save.currentClub.clubId)!;
  const opp = clubById(r.opponentClubId)!;
  
  // Generate dynamic headline based on actual result
  let title = "";
  const score = `${gf}-${ga}`;
  
  switch (key) {
    case "loss":
      title = `${club.name} kalah ${score} dari ${opp.name}`;
      break;
    case "win":
      title = `${club.name} menang ${score} atas ${opp.name}`;
      break;
    case "draw":
      title = `${club.name} vs ${opp.name} bermain imbang ${score}`;
      break;
    case "hattrick":
      title = `${save.player.name} cetak hattrick! ${club.name} ${gf}-${ga} ${opp.name}`;
      break;
    case "brace":
      title = `${save.player.name} cetak 2 gol! ${club.name} ${gf}-${ga} ${opp.name}`;
      break;
    case "goal":
      title = `${save.player.name} cetak gol! ${club.name} ${gf}-${ga} ${opp.name}`;
      break;
    case "assist":
      title = `${save.player.name} berikan ${r.assists} assist! ${club.name} ${gf}-${ga} ${opp.name}`;
      break;
    case "motm":
      title = `${save.player.name} Man of the Match! ${club.name} ${gf}-${ga} ${opp.name}`;
      break;
    case "card_red":
      title = `${save.player.name} diusir! ${club.name} ${gf}-${ga} ${opp.name}`;
      break;
    case "injury":
      title = `${save.player.name} cedera! ${club.name} ${gf}-${ga} ${opp.name}`;
      break;
    case "benched":
      title = `${save.player.name} tidak dimainkan. ${club.name} ${gf}-${ga} ${opp.name}`;
      break;
    default:
      title = `${club.name} ${gf}-${ga} ${opp.name}`;
  }
  
  return {
    id: uid(),
    season: save.season.index,
    matchday: save.season.matchday + 1,
    tag: key === "injury" ? "injury" : "match",
    title,
    body: `${club.short} ${gf}-${ga} ${opp.short} • Musim ${save.season.index}, Pekan ${save.season.matchday + 1}`,
  };
}

export function previewOpponent(save: Save, rng: RNG) {
  const str = save.id + save.season.index + save.season.matchday;
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  const fixedRng = mulberry32(hash);
  return pickOpponent(save, fixedRng);
}
