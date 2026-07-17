import { chance, pick, range, uid, type RNG } from "./rng";
import type { AwardRecord, Offer, SeasonEndResult, TrophyRecord, Save, Position } from "./types";
import { CLUBS, clubById, clubsByLeague } from "../store";
import { COMPETITIONS } from "../store";
import { generateLeagueStandings } from "./league";

// Season-end: compute league position, trophies, awards, transfer offers
export function rollSeasonEnd(save: Save, rng: RNG): SeasonEndResult {
  const club = clubById(save.currentClub.clubId);
  if (!club) return { seasonIndex: save.season.index, leaguePosition: 99, trophies: [], awards: [], offers: [], renewal: undefined, playerOfTheYear: false };
  const seasonIdx = save.season.index;
  const stats = save.season.currentStats;
  const avgRating = stats.ratingCount ? stats.ratingSum / stats.ratingCount : 6.5;

  // Use actual league position from standings
  const standings = generateLeagueStandings(save);
  const leaguePosition = standings.findIndex(row => row.clubId === club.id) + 1;

  const trophies: TrophyRecord[] = [];
  // domestic league
  if (leaguePosition === 1) {
    const leagueComp = COMPETITIONS.find((c) => (c.league_id || c.league) === club.league && c.scope === "domestic-league");
    if (leagueComp) trophies.push({ id: uid(), competitionId: leagueComp.id, season: seasonIdx, clubId: club.id });
  }
  // domestic cup
  const cup = COMPETITIONS.find((c) => (c.league_id || c.league) === club.league && c.scope === "domestic-cup");
  if (cup) {
    const cupChance = club.tier === 1 ? 0.25 : club.tier === 2 ? 0.15 : 0.05;
    if (chance(cupChance, rng)) trophies.push({ id: uid(), competitionId: cup.id, season: seasonIdx, clubId: club.id });
  }
  // continental — only for European tier 1-2 clubs mostly
  if (club.league !== "mls" && club.league !== "saudi") {
    if (club.tier === 1 && chance(0.18, rng))
      trophies.push({ id: uid(), competitionId: "ucl", season: seasonIdx, clubId: club.id });
    else if (club.tier === 2 && chance(0.18, rng))
      trophies.push({ id: uid(), competitionId: "uel", season: seasonIdx, clubId: club.id });
    else if (club.tier <= 3 && chance(0.12, rng))
      trophies.push({ id: uid(), competitionId: "uecl", season: seasonIdx, clubId: club.id });
  }

  // Awards
  const awards: AwardRecord[] = [];
  const isGK = save.player.position === "GK";
  const goalRate = stats.apps > 0 ? stats.goals / stats.apps : 0;

  // Golden Boot: attackers with high goal rate
  if (!isGK && stats.goals >= 20 && chance(0.35 + goalRate * 0.6, rng)) {
    awards.push({ id: uid(), awardId: "golden-boot", season: seasonIdx, clubId: club.id, detail: `${stats.goals} gol` });
  }
  // Golden Glove: GK with clean sheets
  if (isGK && stats.cleanSheets >= 12 && chance(0.4, rng)) {
    awards.push({ id: uid(), awardId: "golden-glove", season: seasonIdx, clubId: club.id, detail: `${stats.cleanSheets} clean sheet` });
  }
  // TOTS: high rating
  if (avgRating >= 7.5 && chance(0.5, rng)) {
    awards.push({ id: uid(), awardId: "tots", season: seasonIdx, clubId: club.id });
  }
  // POTY league
  if (avgRating >= 7.7 && chance(0.35, rng)) {
    awards.push({ id: uid(), awardId: "poty-league", season: seasonIdx, clubId: club.id });
  }
  // Best Young
  if (save.player.age <= 21 && avgRating >= 7.2 && chance(0.35, rng)) {
    awards.push({ id: uid(), awardId: "best-young", season: seasonIdx, clubId: club.id });
  }
  // Ballon d'Or: elite performance + trophy
  let playerOfTheYear = false;
  if (avgRating >= 7.8 && trophies.some((t) => t.competitionId === "ucl" || t.competitionId === club.league)) {
    if (chance(0.4, rng)) {
      awards.push({ id: uid(), awardId: "ballon-dor", season: seasonIdx, clubId: club.id });
      playerOfTheYear = true;
    }
  }
  if (avgRating >= 7.6 && chance(0.15, rng)) {
    if (!awards.find((a) => a.awardId === "fifa-best"))
      awards.push({ id: uid(), awardId: "fifa-best", season: seasonIdx, clubId: club.id });
  }

  // Transfer offers
  const offers: Offer[] = [];
  const nOffers = avgRating >= 7.5 ? range(3, 5, rng) : avgRating >= 7 ? range(2, 3, rng) : avgRating >= 6.5 ? range(1, 2, rng) : range(0, 1, rng);
  const eligibleClubs = CLUBS.filter((c) => c.id !== club.id);
  const pool = pickTopClubs(eligibleClubs, save.attributes.overall, rng);
  for (let i = 0; i < nOffers && pool.length; i++) {
    const c = pool.shift()!;
    const baseFee = c.tier === 1 ? 90 : c.tier === 2 ? 55 : c.tier === 3 ? 30 : 15;
    const ovrMult = save.attributes.overall >= 88 ? 1.6 : save.attributes.overall >= 82 ? 1.2 : save.attributes.overall >= 76 ? 0.8 : 0.4;
    const fee = Math.round((baseFee * ovrMult + range(-10, 20, rng)) * 10) / 10;
    const wage = Math.max(20, Math.round(fee * range(3, 6, rng)));
    offers.push({
      id: uid(), clubId: c.id, fee: Math.max(1, fee),
      wage, years: range(2, 5, rng), type: "transfer",
    });
  }

  // renewal offer if club happy
  const renewal: Offer | undefined = avgRating >= 6.8 && chance(0.7, rng)
    ? {
        id: uid(), clubId: club.id, fee: 0,
        wage: Math.round(save.currentClub.wage * (1 + range(10, 40, rng) / 100)),
        years: range(2, 4, rng), type: "renewal",
      }
    : undefined;

  return { seasonIndex: seasonIdx, leaguePosition, trophies, awards, offers, renewal, playerOfTheYear };
}

function pickTopClubs(clubs: typeof CLUBS, ovr: number, rng: RNG) {
  // top clubs interested if player is elite
  const min = ovr >= 88 ? 1 : ovr >= 82 ? 2 : ovr >= 76 ? 3 : 4;
  const filtered = clubs.filter((c) => c.tier <= min + 1);
  // shuffle
  const arr = [...filtered];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Determine per-position minimum overall thresholds for retirement
export function shouldRetire(save: Save): boolean {
  if (save.player.age >= 40) return true;
  if (save.player.age >= 34 && save.attributes.overall < 65) return true;
  return false;
}

export function _pos(p: Position) { return p; }
