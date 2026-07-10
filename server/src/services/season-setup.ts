// Season setup — generate all matches (league + cups + continental) for a save's current season.
import { query } from "../db.js";
import { getComps, clubsByLeague, ClubRow, CompRow } from "./reference-cache.js";
import { rngFor, shuffle, chance, range } from "./rng.js";

type SaveRow = {
  id: string; seed: number;
  current_club_id: string;
  season_index: number;
};

/**
 * Determines which cups & continental competitions the player's club is qualified for this season,
 * based on club tier + league.
 */
async function qualifiedCompetitions(club: ClubRow, seasonIdx: number, seed: number): Promise<CompRow[]> {
  const comps = await getComps();
  const qualified: CompRow[] = [];

  // Domestic league — always
  const league = comps.find(c => c.scope === "domestic-league" && c.league_id === club.league_id);
  if (league) qualified.push(league);

  // Domestic cups (main + league cup if exists)
  const cups = comps.filter(c => c.league_id === club.league_id && (c.scope === "domestic-cup" || c.scope === "domestic-league-cup"));
  qualified.push(...cups);

  // Continental — European leagues, based on tier
  const europeanLeagues = ["epl", "laliga", "seriea", "bundesliga", "ligue1", "eredivisie", "liga-pt", "super-lig"];
  if (europeanLeagues.includes(club.league_id)) {
    const rng = rngFor(seed, "continental", seasonIdx);
    const ucl = comps.find(c => c.id === "ucl")!;
    const uel = comps.find(c => c.id === "uel")!;
    const uecl = comps.find(c => c.id === "uecl")!;
    if (club.tier === 1) qualified.push(ucl);
    else if (club.tier === 2 && chance(0.65, rng)) qualified.push(ucl);
    else if (club.tier === 2) qualified.push(uel);
    else if (club.tier === 3 && chance(0.4, rng)) qualified.push(uel);
    else if (club.tier === 3) qualified.push(uecl);
    else if (club.tier === 4 && chance(0.25, rng)) qualified.push(uecl);
  }
  return qualified;
}

type PlannedMatch = {
  competition_id: string;
  matchday: number | null;
  stage: string | null;
  order_key: number;
  opponent_club_id: string;
  home: boolean;
};

async function planLeague(club: ClubRow, comp: CompRow, seed: number, seasonIdx: number, orderStart: number): Promise<PlannedMatch[]> {
  const rng = rngFor(seed, "league", comp.id, seasonIdx);
  const others = (await clubsByLeague(club.league_id)).filter(c => c.id !== club.id);
  // Ensure at least 18 opponents for round-robin; if league is small, repeat home/away
  const doubleRound = shuffle(others, rng).concat(shuffle(others, rngFor(seed, "leagueR2", comp.id, seasonIdx)));
  const out: PlannedMatch[] = [];
  let order = orderStart;
  doubleRound.forEach((opp, i) => {
    out.push({
      competition_id: comp.id,
      matchday: i + 1,
      stage: null,
      order_key: order++,
      opponent_club_id: opp.id,
      home: i % 2 === 0,
    });
  });
  return out;
}

async function planKnockout(club: ClubRow, comp: CompRow, seed: number, seasonIdx: number, orderStart: number, midMatchdaySpacing: number): Promise<PlannedMatch[]> {
  const rng = rngFor(seed, "cup", comp.id, seasonIdx);
  const others = shuffle((await clubsByLeague(club.league_id)).filter(c => c.id !== club.id), rng);
  const rounds = comp.rounds ?? [];
  // We plan only the entry stage as a match; further rounds are appended after user commits & advances
  const opp = others[0];
  if (!opp || rounds.length === 0) return [];
  return [{
    competition_id: comp.id,
    matchday: null,
    stage: rounds[0],
    order_key: orderStart,
    opponent_club_id: opp.id,
    home: chance(0.5, rng),
  }];
}

async function planContinental(club: ClubRow, comp: CompRow, seed: number, seasonIdx: number, orderStart: number): Promise<PlannedMatch[]> {
  const rng = rngFor(seed, "cont", comp.id, seasonIdx);
  // Group stage: 6 matches; opponents drawn from other top clubs across leagues
  const allClubs = await (await import("./reference-cache.js")).getClubs();
  const opponents = shuffle(allClubs.filter(c => c.id !== club.id && c.tier <= 3), rng).slice(0, 3);
  const out: PlannedMatch[] = [];
  let order = orderStart;
  if (comp.format === "group_knockout") {
    // 6 group matches (2 vs each of 3 opponents)
    opponents.forEach((opp, i) => {
      out.push({ competition_id: comp.id, matchday: null, stage: "GS", order_key: order++, opponent_club_id: opp.id, home: true });
      out.push({ competition_id: comp.id, matchday: null, stage: "GS", order_key: order++, opponent_club_id: opp.id, home: false });
    });
  } else {
    // pure knockout: entry round only
    const opp = opponents[0];
    if (opp) out.push({ competition_id: comp.id, matchday: null, stage: comp.rounds?.[0] ?? "R16", order_key: order++, opponent_club_id: opp.id, home: chance(0.5, rng) });
  }
  return out;
}

export async function setupSeason(save: SaveRow, club: ClubRow): Promise<{ matches: number; competitions: string[] }> {
  const qualified = await qualifiedCompetitions(club, save.season_index, save.seed);
  await query("DELETE FROM matches WHERE save_id = $1 AND season_idx = $2", [save.id, save.season_index]);
  await query("DELETE FROM season_competitions WHERE save_id = $1 AND season_idx = $2", [save.id, save.season_index]);

  for (const c of qualified) {
    await query(
      `INSERT INTO season_competitions (save_id, season_idx, competition_id, qualified, current_stage)
       VALUES ($1, $2, $3, TRUE, $4)`,
      [save.id, save.season_index, c.id, c.format === "league" ? null : (c.rounds?.[0] ?? null)],
    );
  }

  // Interleave: league in order + cup/continental matches spaced through the season
  let order = 0;
  const plans: PlannedMatch[] = [];
  for (const c of qualified) {
    if (c.format === "league") {
      plans.push(...(await planLeague(club, c, save.seed, save.season_index, 0)));
    }
  }
  // sort league by matchday, then insert non-league matches spaced every ~3-4 matchdays
  plans.sort((a, b) => (a.matchday ?? 0) - (b.matchday ?? 0));
  const nonLeague: PlannedMatch[] = [];
  for (const c of qualified) {
    if (c.format === "knockout") nonLeague.push(...(await planKnockout(club, c, save.seed, save.season_index, 0, 5)));
    else if (c.format === "group_knockout" || (c.format === "knockout" && c.scope === "continental")) {
      // handled below for continental too
    }
    if (c.scope === "continental") nonLeague.push(...(await planContinental(club, c, save.seed, save.season_index, 0)));
  }
  // interleave: insert 1 non-league every 4 matches
  const merged: PlannedMatch[] = [];
  let li = 0, ni = 0;
  while (li < plans.length || ni < nonLeague.length) {
    for (let k = 0; k < 4 && li < plans.length; k++) merged.push(plans[li++]);
    if (ni < nonLeague.length) merged.push(nonLeague[ni++]);
  }
  merged.forEach((m, i) => (m.order_key = i));

  // Insert
  for (const m of merged) {
    await query(
      `INSERT INTO matches (save_id, season_idx, competition_id, matchday, stage, order_key, opponent_club_id, home)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [save.id, save.season_index, m.competition_id, m.matchday, m.stage, m.order_key, m.opponent_club_id, m.home],
    );
  }
  return { matches: merged.length, competitions: qualified.map(c => c.id) };
}
