// Awards engine — compute nominees & winners for all awards at season-end.
import { query } from "../db.js";
import { RNG, chance, range, rngFor, shuffle, pick } from "./rng.js";
import { getComps, getClubs, ClubRow } from "./reference-cache.js";

const FIRST = [
  "Marco",
  "Luka",
  "Diego",
  "Andres",
  "Kai",
  "Jamal",
  "Youssef",
  "Ivan",
  "Rasmus",
  "Kenji",
  "Mateo",
  "Amir",
  "Bruno",
  "Pablo",
  "Leon",
  "Eren",
  "Milos",
  "Noah",
  "Ilias",
  "Rio",
];
const LAST = [
  "Silva",
  "Petrov",
  "Almeida",
  "Volkov",
  "Nakamura",
  "Ozturk",
  "Fernandez",
  "Martinez",
  "Bergstrom",
  "Karim",
  "Costa",
  "Rossi",
  "Fischer",
  "Van der Berg",
  "Vardanyan",
  "Kowalski",
  "Andrade",
  "Osman",
  "Mendes",
  "Torres",
];

function fakePlayer(rng: RNG) {
  return `${pick(FIRST, rng)} ${pick(LAST, rng)}`;
}

export type PlayerSeasonAgg = {
  save_id: string;
  season_idx: number;
  apps: number;
  goals: number;
  assists: number;
  clean_sheets: number;
  saves: number;
  avg_rating: number;
  motm_count: number;
  age: number;
  position: string;
  overall: number;
  current_club_id: string;
  league_id: string;
  trophies: string[]; // competition ids won
  ucl_won: boolean;
  domestic_league_won: boolean;
};

export type AwardResult = {
  award_id: string;
  scope_key?: string; // e.g. league_id or "world"
  winner_is_you: boolean;
  winner_name: string;
  winner_club_id: string | null;
  detail: string | null;
  your_rank: number | null;
  nominees: {
    rank: number;
    name: string;
    club_id: string | null;
    is_you: boolean;
    stats?: Record<string, unknown>;
  }[];
};

export async function computePlayerAgg(save: {
  id: string;
  season_index: number;
  player: any;
  attributes: any;
  current_club_id: string;
}): Promise<PlayerSeasonAgg> {
  const { rows: matchRows } = await query<any>(
    `SELECT competition_id, player_goals, player_assists, player_rating, clean_sheet, motm, player_saves, played
     FROM matches WHERE save_id = $1 AND season_idx = $2 AND played = TRUE`,
    [save.id, save.season_index],
  );
  const apps = matchRows.filter(
    (m) => m.player_minutes || m.player_goals || m.player_rating,
  ).length;
  const goals = matchRows.reduce((a, m) => a + (m.player_goals ?? 0), 0);
  const assists = matchRows.reduce((a, m) => a + (m.player_assists ?? 0), 0);
  const clean = matchRows.filter((m) => m.clean_sheet).length;
  const saves = matchRows.reduce((a, m) => a + (m.player_saves ?? 0), 0);
  const motm = matchRows.filter((m) => m.motm).length;
  const ratings = matchRows
    .filter((m) => m.player_rating && m.player_rating > 0)
    .map((m) => m.player_rating);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 6.5;

  const { rows: trophyRows } = await query<{ competition_id: string }>(
    "SELECT competition_id FROM trophies WHERE save_id = $1 AND season_idx = $2",
    [save.id, save.season_index],
  );
  const trophies = trophyRows.map((t) => t.competition_id);

  const club = (await getClubs()).find((c) => c.id === save.current_club_id)!;

  return {
    save_id: save.id,
    season_idx: save.season_index,
    apps,
    goals,
    assists,
    clean_sheets: clean,
    saves,
    motm_count: motm,
    avg_rating: +avg.toFixed(2),
    age: save.player.age,
    position: save.player.position,
    overall: save.attributes.overall,
    current_club_id: save.current_club_id,
    league_id: club.league_id,
    trophies,
    ucl_won: trophies.includes("ucl"),
    domestic_league_won: trophies.some((t) => t === club.league_id),
  };
}

function buildNominees(
  agg: PlayerSeasonAgg,
  rng: RNG,
  count: number,
  yourScore: number,
  opts: {
    requireLeague?: boolean;
    clubs: ClubRow[];
    // Baseline skor rival yang INDEPENDEN dari skor kamu.
    // Rival tidak lagi diklustr di sekitar skor kamu — mereka punya
    // standar sendiri. Kalau kamu tidak mencapai baseline ini, kamu
    // tidak akan menang meski musimmu terasa "bagus".
    rivalBaseline: number;
    // Half-spread skor rival (default 35). Makin besar = makin bervariasi.
    rivalSpread?: number;
  },
): { rank: number; name: string; club_id: string | null; is_you: boolean; score: number }[] {
  const rivals: { name: string; club_id: string | null; score: number }[] = [];
  const pool = shuffle(
    opts.clubs.filter((c) => c.tier <= 3),
    rng,
  );
  const spread = opts.rivalSpread ?? 35;
  for (let i = 0; i < count * 2; i++) {
    const club = pool[i % pool.length];
    if (opts.requireLeague && club.league_id !== agg.league_id) continue;
    // Skor rival diambil dari distribusi independen di sekitar baseline award —
    // bukan relatif ke skor kamu. Ini yang membuat award jadi kompetitif.
    const noise = (rng() - 0.5) * spread * 2;
    rivals.push({
      name: fakePlayer(rng),
      club_id: club.id,
      score: Math.max(0, opts.rivalBaseline + noise),
    });
  }
  const all = [
    { name: "YOU", club_id: agg.current_club_id, score: yourScore, is_you: true },
    ...rivals.slice(0, count * 2).map((r) => ({ ...r, is_you: false })),
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
  return all.map((n, i) => ({
    rank: i + 1,
    name: n.is_you ? "You" : n.name,
    club_id: n.club_id,
    is_you: n.is_you,
    score: n.score,
  }));
}

export async function computeSeasonAwards(
  agg: PlayerSeasonAgg,
  seed: number,
): Promise<AwardResult[]> {
  const clubs = await getClubs();
  const comps = await getComps();
  const isGK = agg.position === "GK";
  const results: AwardResult[] = [];

  // Base "quality" of your season
  const perfScore =
    agg.avg_rating * 10 +
    agg.goals * 2 +
    agg.assists * 1.5 +
    agg.clean_sheets * 1.5 +
    agg.motm_count * 2 +
    Math.min(agg.apps, 38) * 0.5;
  const trophyBonus =
    (agg.domestic_league_won ? 25 : 0) + (agg.ucl_won ? 40 : 0) + agg.trophies.length * 5;
  const appsFactor = Math.min(1, Math.max(0.3, agg.apps / 25));
  const worldScore = (perfScore + trophyBonus) * appsFactor;

  const mk = (
    award_id: string,
    nominees: ReturnType<typeof buildNominees>,
    detail?: string | null,
  ): AwardResult => {
    const yours = nominees.find((n) => n.is_you);
    const winner = nominees[0];
    return {
      award_id,
      winner_is_you: !!winner.is_you,
      winner_name: winner.is_you ? "You" : winner.name,
      winner_club_id: winner.club_id,
      detail: detail ?? null,
      your_rank: yours ? yours.rank : null,
      nominees: nominees.map((n) => ({
        rank: n.rank,
        name: n.name,
        club_id: n.club_id,
        is_you: n.is_you,
        stats: { score: +n.score.toFixed(1) },
      })),
    };
  };

  // === PENGHARGAAN LIGA ===

  // Golden Boot — baseline: setara ~22 gol + rating 7.4 (top scorer liga kelas atas)
  if (!isGK) {
    const gbBaseline = 22 * 5 + 7.4 * 5; // ≈ 147
    const score = agg.goals * 5 + agg.avg_rating * 5;
    results.push(
      mk(
        "golden-boot",
        buildNominees(agg, rngFor(seed, "gb", agg.season_idx), 5, score, {
          requireLeague: true,
          clubs,
          rivalBaseline: gbBaseline,
          rivalSpread: 40,
        }),
        `${agg.goals} gol`,
      ),
    );
    // Top Assist — baseline: setara ~12 assist + rating 7.4
    const taBaseline = 12 * 6 + 7.4 * 4; // ≈ 102
    const aScore = agg.assists * 6 + agg.avg_rating * 4;
    results.push(
      mk(
        "top-assist",
        buildNominees(agg, rngFor(seed, "ta", agg.season_idx), 5, aScore, {
          requireLeague: true,
          clubs,
          rivalBaseline: taBaseline,
          rivalSpread: 30,
        }),
        `${agg.assists} assist`,
      ),
    );
  }
  // Golden Glove — baseline: setara ~15 clean sheet + 100 saves + rating 7.4
  if (isGK) {
    const ggBaseline = 15 * 6 + 100 * 0.4 + 7.4 * 6; // ≈ 174
    const gScore = agg.clean_sheets * 6 + agg.saves * 0.4 + agg.avg_rating * 6;
    results.push(
      mk(
        "golden-glove",
        buildNominees(agg, rngFor(seed, "gg", agg.season_idx), 5, gScore, {
          requireLeague: true,
          clubs,
          rivalBaseline: ggBaseline,
          rivalSpread: 40,
        }),
        `${agg.clean_sheets} clean sheet`,
      ),
    );
  }
  // Best Young Player (liga) — baseline: rating 7.6, 12 gol, 5 motm
  if (agg.age <= 21) {
    const byBaseline = 7.6 * 10 + 12 * 1.5 + 5 * 3; // ≈ 109
    const yScore = agg.avg_rating * 10 + agg.goals * 1.5 + agg.motm_count * 3;
    results.push(
      mk(
        "best-young",
        buildNominees(agg, rngFor(seed, "by", agg.season_idx), 5, yScore, {
          requireLeague: true,
          clubs,
          rivalBaseline: byBaseline,
          rivalSpread: 28,
        }),
        `Rating rata-rata ${agg.avg_rating}`,
      ),
    );
  }
  // POTY Liga — baseline: setara musim bagus di liga kelas atas (rating 8.0, 18 gol, 8 assist, 10 motm, 38 apps)
  {
    const potyBaseline = 8.0 * 10 + 18 * 2 + 8 * 1.5 + 0 + 10 * 2 + 38 * 0.5; // ≈ 183
    results.push(
      mk(
        "poty-league",
        buildNominees(agg, rngFor(seed, "poty", agg.season_idx), 6, perfScore, {
          requireLeague: true,
          clubs,
          rivalBaseline: potyBaseline,
          rivalSpread: 40,
        }),
      ),
    );
  }
  // TOTS (11) — kamu masuk atau tidak; threshold rating dinaikkan jadi 7.8
  {
    const rng = rngFor(seed, "tots", agg.season_idx);
    const inTOTS = agg.avg_rating >= 7.8 && agg.apps >= 20 && chance(0.5, rng);
    const xi: { rank: number; name: string; club_id: string | null; is_you: boolean }[] = [];
    const pool = shuffle(
      clubs.filter((c) => c.league_id === agg.league_id && c.tier <= 3),
      rng,
    );
    for (let i = 0; i < 11; i++) {
      const isYou = i === 0 && inTOTS;
      xi.push({
        rank: i + 1,
        name: isYou ? "You" : fakePlayer(rng),
        club_id: isYou ? agg.current_club_id : pool[i % pool.length].id,
        is_you: isYou,
      });
    }
    const you = xi.find((x) => x.is_you);
    results.push({
      award_id: "tots",
      winner_is_you: !!inTOTS,
      winner_name: "Team of the Season",
      winner_club_id: null,
      detail: inTOTS ? "Terpilih dalam TOTS" : null,
      your_rank: you ? you.rank : null,
      nominees: xi.map((x) => ({
        rank: x.rank,
        name: x.name,
        club_id: x.club_id,
        is_you: x.is_you,
      })),
    });
  }

  // === PENGHARGAAN CONTINENTAL ===
  if (agg.trophies.includes("ucl") || agg.avg_rating >= 7.8) {
    // UCL POTY — baseline: musim UCL solid (rating 8.0, kontribusi bagus)
    const uclBaseline = 190;
    const uclScore = perfScore + (agg.ucl_won ? 50 : 0);
    results.push(
      mk(
        "ucl-poty",
        buildNominees(agg, rngFor(seed, "uclp", agg.season_idx), 5, uclScore, {
          clubs,
          rivalBaseline: uclBaseline,
          rivalSpread: 50,
        }),
      ),
    );
    // UCL Top Scorer — baseline: setara ~8 gol UCL
    if (!isGK)
      results.push(
        mk(
          "ucl-top-scorer",
          buildNominees(agg, rngFor(seed, "uclt", agg.season_idx), 5, agg.goals * 8, {
            clubs,
            rivalBaseline: 8 * 8,
            rivalSpread: 25,
          }),
          `${Math.max(agg.goals, 0)} gol UCL`,
        ),
      );
  }

  // === PENGHARGAAN DUNIA ===
  // Ballon d'Or — baseline: musim luar biasa untuk pemain elite dunia
  // (rating 8.3, 25 gol, 10 assist, 15 motm, 38 apps, juara liga + UCL)
  // perfScore ≈ 8.3*10+25*2+10*1.5+0+15*2+38*0.5 = 83+50+15+30+19 = 197
  // trophyBonus = 25+40+3*5 = 80, worldScore ≈ 277
  const bdorBaseline = 260; // hanya musim benar-benar luar biasa yg bisa menang
  results.push(
    mk(
      "ballon-dor",
      buildNominees(agg, rngFor(seed, "bdor", agg.season_idx), 10, worldScore, {
        clubs,
        rivalBaseline: bdorBaseline,
        rivalSpread: 65,
      }),
    ),
  );

  // FIFA The Best — sedikit lebih mudah dari Ballon d'Or tapi tetap ketat
  const fifaBaseline = 245;
  results.push(
    mk(
      "fifa-best",
      buildNominees(
        agg,
        rngFor(seed, "fifab", agg.season_idx),
        7,
        worldScore * 0.95 + range(-5, 5, rngFor(seed, "fifabn", agg.season_idx)),
        { clubs, rivalBaseline: fifaBaseline, rivalSpread: 60 },
      ),
    ),
  );

  // UEFA POTY — baseline agak lebih rendah, fokus di Eropa
  const uefaBaseline = 220;
  results.push(
    mk(
      "uefa-poty",
      buildNominees(
        agg,
        rngFor(seed, "uefap", agg.season_idx),
        5,
        worldScore + (agg.ucl_won ? 20 : 0),
        { clubs, rivalBaseline: uefaBaseline, rivalSpread: 55 },
      ),
    ),
  );

  // Golden Boy (dunia, u21) — baseline lebih rendah tapi tetap butuh musim bagus
  if (agg.age <= 21) {
    const gboyBaseline = 160;
    results.push(
      mk(
        "golden-boy",
        buildNominees(agg, rngFor(seed, "gboy", agg.season_idx), 10, worldScore * 1.2, {
          clubs,
          rivalBaseline: gboyBaseline,
          rivalSpread: 50,
        }),
      ),
    );
  }

  // TOTY (world 11) — threshold worldScore dinaikkan jadi 250, chance diturunkan jadi 0.25
  {
    const rng = rngFor(seed, "toty", agg.season_idx);
    const inTOTY = worldScore >= 250 && chance(0.25, rng);
    const xi: { rank: number; name: string; club_id: string | null; is_you: boolean }[] = [];
    const pool = shuffle(
      clubs.filter((c) => c.tier === 1),
      rng,
    );
    for (let i = 0; i < 11; i++) {
      const isYou = i === 0 && inTOTY;
      xi.push({
        rank: i + 1,
        name: isYou ? "You" : fakePlayer(rng),
        club_id: isYou ? agg.current_club_id : pool[i % pool.length].id,
        is_you: isYou,
      });
    }
    const you = xi.find((x) => x.is_you);
    results.push({
      award_id: "toty",
      winner_is_you: !!inTOTY,
      winner_name: "FIFPRO XI",
      winner_club_id: null,
      detail: inTOTY ? "Terpilih dalam TOTY dunia" : null,
      your_rank: you ? you.rank : null,
      nominees: xi.map((x) => ({
        rank: x.rank,
        name: x.name,
        club_id: x.club_id,
        is_you: x.is_you,
      })),
    });
  }

  return results;
}

export async function computeSeasonTrophies(
  agg: PlayerSeasonAgg,
  seed: number,
): Promise<{ competition_id: string; club_id: string }[]> {
  const comps = await getComps();
  const clubs = await getClubs();
  const club = clubs.find((c) => c.id === agg.current_club_id)!;
  const trophies: { competition_id: string; club_id: string }[] = [];

  // League: use club tier + player boost
  const rng = rngFor(seed, "trophy", agg.season_idx);
  const league = comps.find((c) => c.scope === "domestic-league" && c.league_id === club.league_id);
  if (league) {
    const boost = (agg.avg_rating - 6.8) * 0.5 + agg.goals / 40;
    const baseWin = club.tier === 1 ? 0.28 : club.tier === 2 ? 0.1 : club.tier === 3 ? 0.03 : 0.01;
    if (chance(Math.min(0.6, baseWin + boost * 0.2), rng))
      trophies.push({ competition_id: league.id, club_id: club.id });
  }
  // Domestic cups
  for (const c of comps.filter(
    (x) =>
      x.league_id === club.league_id &&
      (x.scope === "domestic-cup" || x.scope === "domestic-league-cup"),
  )) {
    const baseWin = club.tier === 1 ? 0.22 : club.tier === 2 ? 0.14 : club.tier === 3 ? 0.06 : 0.02;
    if (chance(baseWin + (agg.avg_rating - 6.8) * 0.1, rng))
      trophies.push({ competition_id: c.id, club_id: club.id });
  }
  // Continental — only if qualified this season
  const { rows: seasonComps } = await query<{ competition_id: string }>(
    "SELECT competition_id FROM season_competitions WHERE save_id = $1 AND season_idx = $2",
    [agg.save_id, agg.season_idx],
  );
  const qids = seasonComps.map((s) => s.competition_id);
  for (const cid of ["ucl", "uel", "uecl"]) {
    if (!qids.includes(cid)) continue;
    const base = cid === "ucl" ? (club.tier === 1 ? 0.18 : 0.05) : cid === "uel" ? 0.12 : 0.15;
    if (chance(base + (agg.avg_rating - 6.8) * 0.15, rng))
      trophies.push({ competition_id: cid, club_id: club.id });
  }
  return trophies;
}
