import { Router } from "express";
import { query } from "../db.js";
import { setupSeason } from "../services/season-setup.js";
import { simulateMatchDeterministic, calcTeamStrength } from "../services/match-sim.js";
import { clubById, compById } from "../services/reference-cache.js";
import {
  computePlayerAgg,
  computeSeasonAwards,
  computeSeasonTrophies,
} from "../services/awards-engine.js";
import { rngFor, range } from "../services/rng.js";

export const gameRouter = Router();

// ----- Season -----
gameRouter.post("/saves/:id/season/start", async (req, res) => {
  const { rows } = await query<any>("SELECT id, data FROM saves WHERE id = $1", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: "Save not found" });
  const save = rows[0].data;
  const seed = save.seed ?? 1;
  const club = await clubById(save.currentClub.clubId);
  if (!club) return res.status(400).json({ error: "Club not found" });
  const saveRow = {
    id: save.id,
    seed,
    current_club_id: club.id,
    season_index: save.season?.index ?? 0,
  };
  const out = await setupSeason(saveRow, club);
  res.json(out);
});

gameRouter.get("/saves/:id/season/:idx/matches", async (req, res) => {
  const { rows } = await query<any>(
    `SELECT m.*, c.name AS comp_name, c.short AS comp_short, c.scope AS comp_scope,
            cl.name AS opp_name, cl.short AS opp_short, cl.color_primary AS opp_color
     FROM matches m
     JOIN competitions c ON c.id = m.competition_id
     JOIN clubs cl ON cl.id = m.opponent_club_id
     WHERE m.save_id = $1 AND m.season_idx = $2
     ORDER BY m.order_key ASC`,
    [req.params.id, req.params.idx],
  );
  res.json(rows);
});

// ----- Match preview (unlimited re-roll) -----
gameRouter.get("/saves/:id/matches/next/preview", async (req, res) => {
  const previewSeed = Number(req.query.previewSeed ?? Date.now());
  const { rows: saveRows } = await query<any>("SELECT id, data FROM saves WHERE id = $1", [
    req.params.id,
  ]);
  if (!saveRows[0]) return res.status(404).json({ error: "Save not found" });
  const save = saveRows[0].data;
  const { rows: mRows } = await query<any>(
    `SELECT * FROM matches WHERE save_id = $1 AND season_idx = $2 AND played = FALSE
     ORDER BY order_key ASC LIMIT 1`,
    [req.params.id, save.season?.index ?? 0],
  );
  const m = mRows[0];
  if (!m) return res.status(404).json({ error: "No matches remaining" });

  const club = await clubById(save.currentClub.clubId);
  const opp = await clubById(m.opponent_club_id);
  const comp = await compById(m.competition_id);
  if (!club || !opp || !comp) return res.status(400).json({ error: "Missing reference data" });

  const saveSeed = save.seed ?? 1;
  const seasonIdx = save.season?.index ?? 0;
  const clubStrength = calcTeamStrength(club.id, saveSeed, seasonIdx);
  const oppStrength = calcTeamStrength(opp.id, saveSeed, seasonIdx);

  const out = simulateMatchDeterministic(
    {
      overall: save.attributes.overall,
      position: save.player.position,
      age: save.player.age,
      club,
      opponent: opp,
      home: m.home,
      competition: comp,
      suspendedMatches: save.suspendedMatches ?? 0,
      injuredMatches: save.injuredMatches ?? 0,
      clubStrength,
      oppStrength,
    },
    saveSeed,
    m.id,
    previewSeed,
  );

  // Generate news & social for preview (mirrors client-side mkNews logic)
  const resultKey = out.red
    ? "card_red"
    : out.teamResult === "L"
      ? "loss"
      : out.teamResult === "D"
        ? "draw"
        : out.teamResult === "W"
          ? out.goals >= 3
            ? "hattrick"
            : out.goals === 2
              ? "brace"
              : out.goals === 1
                ? "goal"
                : out.assists >= 2
                  ? "assist"
                  : "win"
          : out.motm
            ? "motm"
            : "draw";

  const newsTemplates: Record<string, string[]> = {
    win: [
      "{player} bawa {club} menang {goalsFor}-{goalsAgainst} vs {opp}! Rating {rating}.",
      "Kemenangan penting {club} {goalsFor}-{goalsAgainst} atas {opp}. {player} rating {rating}.",
    ],
    draw: [
      "{club} seri {goalsFor}-{goalsAgainst} vs {opp}. {player} rating {rating}.",
      "Hasil imbang {goalsFor}-{goalsAgainst} untuk {club} vs {opp}. {player} rating {rating}.",
    ],
    loss: [
      "{club} kalah {goalsFor}-{goalsAgainst} dari {opp}. {player} rating {rating}.",
      "Kekalahan {goalsFor}-{goalsAgainst} untuk {club} vs {opp}. {player} rating {rating}.",
    ],
    goal: [
      "{player} cetak gol! {club} menang {goalsFor}-{goalsAgainst} vs {opp}. Rating {rating}.",
      "Gol {player} bawa {club} menang {goalsFor}-{goalsAgainst} vs {opp}. Rating {rating}.",
    ],
    brace: [
      "Brace {player}! {club} hancurkan {opp} {goalsFor}-{goalsAgainst}. Rating {rating}.",
      "{player} mencetak 2 gol, {club} menang {goalsFor}-{goalsAgainst} vs {opp}. Rating {rating}.",
    ],
    hattrick: [
      "HAT-TRICK {player}!!! {club} gulingkan {opp} {goalsFor}-{goalsAgainst}. Rating {rating}.",
      "{player} hat-trick! {club} kebut {opp} {goalsFor}-{goalsAgainst}. Rating {rating}.",
    ],
    assist: [
      "{player} assist {assists}x, {club} menang {goalsFor}-{goalsAgainst} vs {opp}. Rating {rating}.",
      "Playmaker {player} {assists} assist, {club} unggul {goalsFor}-{goalsAgainst} vs {opp}. Rating {rating}.",
    ],
    motm: ["{player} Man of the Match! {club} {goalsFor}-{goalsAgainst} {opp}. Rating {rating}."],
    card_red: ["{player} kartu merah! {club} {goalsFor}-{goalsAgainst} {opp}. Rating {rating}."],
  };

  const tpls =
    newsTemplates[resultKey] ??
    newsTemplates[out.teamResult === "W" ? "win" : out.teamResult === "D" ? "draw" : "loss"];
  const tpl = tpls[Math.floor(Math.random() * tpls.length)];
  const newsTitle = tpl
    .replace("{player}", save.player.name)
    .replace("{club}", club.name)
    .replace("{opp}", opp.name)
    .replace("{goalsFor}", String(out.team_goals))
    .replace("{goalsAgainst}", String(out.opp_goals))
    .replace("{goals}", String(out.goals))
    .replace("{assists}", String(out.assists))
    .replace("{rating}", String(out.rating));

  const socialTemplates: Record<string, string[]> = {
    win: [
      "Kemenangan tim! ðŸ’ª {goals} gol buat kemenangan. Bangga bisa bantu {club} menang!",
      "3 poin di kantong! âš½ {goals} gol, tim solid. Yaudah, istirahat dulu. {club} ðŸ’ª",
    ],
    draw: [
      "Seri aja ya... {goals} gol buat tim. Butuh evaluasi buat match depan. {club} ðŸ¤",
      "Hasil imbang {goalsFor}-{goalsAgainst}. {goals} gol pribadi. Tetap semangat! {club} ðŸ’ª",
    ],
    loss: [
      "Kalah {goalsFor}-{goalsAgainst}... {goals} gol tapi belum cukup. Bangkit lagi match depan. {club} ðŸ˜”",
      "Hari ini bukan hari kita. Kalah {goalsFor}-{goalsAgainst}. Belajar dari kekalahan. {club} ðŸ’ª",
    ],
    hattrick: [
      "HAT-TRICK!!! ðŸŽ©âš½âš½âš½ {goals} gol buat {club} vs {opp}! Man of the Match! ðŸ…",
      "HAT-TRICK! 3 gol dalam satu match! Bangga bisa bawa {club} menang besar vs {opp}! ðŸ…",
    ],
    brace: [
      "Brace! âš½âš½ 2 gol buat {club} vs {opp}! Tim solid, lanjut match depan! ðŸ’ª",
      "2 gol hari ini! {club} menang vs {opp}. Semangat buat match berikutnya! ðŸ”¥",
    ],
    goal: [
      "GOL! âš½ Cetak gol buat {club} vs {opp}! Tim menang, itu yang penting! ðŸ’ª",
      "Mencetak gol buat {club}! Kemenangan {goalsFor}-{goalsAgainst} vs {opp}! ðŸ”¥",
    ],
    assist: [
      "Assist buat kemenangan! ðŸ‘Ÿ {assists} assist, {club} menang vs {opp}! Tim dulu, individu kedua. ðŸ¤",
      "{assists} assist hari ini! {club} unggul vs {opp}. Playmaker mode ON! ðŸ‘Ÿ",
    ],
  };

  const socialKey =
    out.goals >= 3
      ? "hattrick"
      : out.goals > 0
        ? "win_goal"
        : out.teamResult === "W"
          ? "win"
          : out.teamResult === "L"
            ? "loss"
            : "draw";
  const socialTpls =
    socialTemplates[socialKey] ??
    socialTemplates[out.teamResult === "W" ? "win" : out.teamResult === "D" ? "draw" : "loss"];
  const socialTpl = socialTpls[Math.floor(Math.random() * socialTpls.length)];
  const socialContent = socialTpl
    .replace("{player}", save.player.name)
    .replace("{club}", club.name)
    .replace("{opp}", opp.name)
    .replace("{goals}", String(out.goals))
    .replace("{assists}", String(out.assists))
    .replace("{goalsFor}", String(out.team_goals))
    .replace("{goalsAgainst}", String(out.opp_goals));

  res.json({
    match: m,
    opponent: opp,
    competition: comp,
    result: out,
    previewSeed,
    news: {
      id: `news-${Date.now()}`,
      title: newsTitle,
      body: `${club.short} ${out.team_goals}-${out.opp_goals} ${opp.short} â€¢ Musim ${save.season?.index ?? 0}, Pekan ${(save.season?.matchday ?? 0) + 1}`,
      tag: "match",
      season: save.season?.index ?? 0,
      matchday: (save.season?.matchday ?? 0) + 1,
    },
    social: {
      id: `social-${Date.now()}`,
      content: socialContent,
      season: save.season?.index ?? 0,
      matchday: (save.season?.matchday ?? 0) + 1,
      likes:
        Math.floor(Math.random() * 4500) +
        500 +
        out.goals * Math.floor(Math.random() * 3500) +
        1000,
      comments: Math.floor(Math.random() * 350) + 50 + out.goals * 200,
      reposts: Math.floor(Math.random() * 170) + 30 + out.goals * 100,
    },
  });
});

// ----- Match commit -----
gameRouter.post("/saves/:id/matches/:mid/commit", async (req, res) => {
  const previewSeed = Number(req.body?.previewSeed ?? 0);
  const { rows: saveRows } = await query<any>("SELECT id, data FROM saves WHERE id = $1", [
    req.params.id,
  ]);
  if (!saveRows[0]) return res.status(404).json({ error: "Save not found" });
  const save = saveRows[0].data;
  const { rows: mRows } = await query<any>("SELECT * FROM matches WHERE id = $1 AND save_id = $2", [
    req.params.mid,
    req.params.id,
  ]);
  const m = mRows[0];
  if (!m) return res.status(404).json({ error: "Match not found" });
  if (m.played) return res.status(409).json({ error: "Match already played" });

  const club = await clubById(save.currentClub.clubId);
  const opp = await clubById(m.opponent_club_id);
  const comp = await compById(m.competition_id);
  if (!club || !opp || !comp) return res.status(400).json({ error: "Missing reference data" });

  const saveSeed = save.seed ?? 1;
  const seasonIdx = save.season?.index ?? 0;
  const clubStrength = calcTeamStrength(club.id, saveSeed, seasonIdx);
  const oppStrength = calcTeamStrength(opp.id, saveSeed, seasonIdx);

  const out = simulateMatchDeterministic(
    {
      overall: save.attributes.overall,
      position: save.player.position,
      age: save.player.age,
      club,
      opponent: opp,
      home: m.home,
      competition: comp,
      suspendedMatches: save.suspendedMatches ?? 0,
      injuredMatches: save.injuredMatches ?? 0,
      clubStrength,
      oppStrength,
    },
    saveSeed,
    m.id,
    previewSeed,
  );

  await query(
    `UPDATE matches SET played = TRUE, team_goals = $1, opp_goals = $2,
       player_selection = $3, player_minutes = $4, player_goals = $5, player_assists = $6,
       player_saves = $7, player_rating = $8, yellow = $9, red = $10, clean_sheet = $11,
       motm = $12, injury_matches = $13, played_at = NOW()
     WHERE id = $14`,
    [
      out.team_goals,
      out.opp_goals,
      out.selection,
      out.minutes,
      out.goals,
      out.assists,
      out.saves,
      out.rating,
      out.yellow,
      out.red,
      out.cleanSheet,
      out.motm,
      out.injuryMatches,
      m.id,
    ],
  );

  // Auto-advance knockout: if it's a KO match and we won, generate next-round match
  if (comp.format !== "league" && m.stage) {
    const stages = comp.rounds ?? [];
    const idx = stages.indexOf(m.stage);
    if (out.teamResult === "W" && idx >= 0 && idx < stages.length - 1) {
      const nextStage = stages[idx + 1];
      const allClubs = await (await import("../services/reference-cache.js")).getClubs();
      const rng = rngFor(save.seed ?? 1, "ko-adv", m.id, nextStage);
      const pool = allClubs.filter((c) => c.id !== club.id && c.tier <= 3);
      const nextOpp = pool[Math.floor(rng() * pool.length)];
      await query(
        `INSERT INTO matches (save_id, season_idx, competition_id, stage, order_key, opponent_club_id, home)
         VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(order_key), 0) + 1 FROM matches WHERE save_id = $1 AND season_idx = $2), $5, $6)`,
        [req.params.id, save.season?.index ?? 0, comp.id, nextStage, nextOpp.id, rng() < 0.5],
      );
      await query(
        `UPDATE season_competitions SET current_stage = $1 WHERE save_id = $2 AND season_idx = $3 AND competition_id = $4`,
        [nextStage, req.params.id, save.season?.index ?? 0, comp.id],
      );
    } else if (out.teamResult !== "W" && comp.format === "knockout") {
      await query(
        `UPDATE season_competitions SET eliminated_at = $1 WHERE save_id = $2 AND season_idx = $3 AND competition_id = $4`,
        [m.stage, req.params.id, save.season?.index ?? 0, comp.id],
      );
    }
  }

  res.json({ result: out, matchId: m.id });
});

// ----- Simulate remaining matches to end of season -----
gameRouter.post("/saves/:id/season/simulate", async (req, res) => {
  try {
    const { rows: saveRows } = await query<any>("SELECT id, data FROM saves WHERE id = $1", [
      req.params.id,
    ]);
    if (!saveRows[0]) return res.status(404).json({ error: "Save not found" });
    const save = saveRows[0].data;
    const seasonIdx = save.season?.index ?? 0;
    const seed = save.seed ?? 1;

    // Get all unplayed matches for this season, ordered by order_key
    const { rows: matches } = await query<any>(
      `SELECT * FROM matches WHERE save_id = $1 AND season_idx = $2 AND played = FALSE ORDER BY order_key ASC`,
      [req.params.id, seasonIdx],
    );

    if (matches.length === 0) {
      return res.json({ simulated: 0, message: "No matches remaining" });
    }

    const club = await clubById(save.currentClub.clubId);
    if (!club) return res.status(400).json({ error: "Club not found" });

    // Accumulators for saves.data
    let matchday = save.season.matchday ?? 0;
    const cs = { ...(save.season.currentStats || {}), apps: 0, starts: 0, goals: 0, assists: 0, cleanSheets: 0, yellows: 0, reds: 0, ratingSum: 0, ratingCount: 0, motm: 0, teamWins: 0, teamDraws: 0, teamLosses: 0, teamGoalsFor: 0, teamGoalsAgainst: 0 };
    let careerApps = save.careerStats?.apps ?? 0;
    let careerGoals = save.careerStats?.goals ?? 0;
    let careerAssists = save.careerStats?.assists ?? 0;
    let careerCleanSheets = save.careerStats?.cleanSheets ?? 0;
    const spinLog = [...(save.spinLog || [])];
    const newsArr = [...(save.news || [])];
    const socialArr = [...(save.social || [])];
    let followers = save.followers ?? 0;
    const milestones = [...(save.milestones || [])];
    let suspendedMatches = save.suspendedMatches ?? 0;
    let injuredMatches = save.injuredMatches ?? 0;
    let simulated = 0;

    for (const m of matches) {
      const opp = await clubById(m.opponent_club_id);
      const comp = await compById(m.competition_id);
      if (!opp || !comp) continue;

      const previewSeed = 0;
      const clubStrength = calcTeamStrength(club.id, seed, seasonIdx);
      const oppStrength = calcTeamStrength(opp.id, seed, seasonIdx);
      const out = simulateMatchDeterministic(
        {
          overall: save.attributes.overall,
          position: save.player.position,
          age: save.player.age,
          club,
          opponent: opp,
          home: m.home,
          competition: comp,
          suspendedMatches,
          injuredMatches,
          clubStrength,
          oppStrength,
        },
        seed,
        m.id,
        previewSeed,
      );

      // Update match with result
      await query(
        `UPDATE matches SET played = TRUE, team_goals = $1, opp_goals = $2,
           player_selection = $3, player_minutes = $4, player_goals = $5, player_assists = $6,
           player_saves = $7, player_rating = $8, yellow = $9, red = $10, clean_sheet = $11,
           motm = $12, injury_matches = $13, played_at = NOW()
         WHERE id = $14`,
        [
          out.team_goals, out.opp_goals, out.selection, out.minutes,
          out.goals, out.assists, out.saves, out.rating,
          out.yellow, out.red, out.cleanSheet, out.motm, out.injuryMatches, m.id,
        ],
      );

      // Accumulate stats
      matchday++;
      const isApp = out.minutes > 0;
      cs.apps += isApp ? 1 : 0;
      cs.starts += out.selection === "starter" ? 1 : 0;
      cs.goals += out.goals;
      cs.assists += out.assists;
      cs.cleanSheets += out.cleanSheet ? 1 : 0;
      cs.yellows += out.yellow ? 1 : 0;
      cs.reds += out.red ? 1 : 0;
      cs.ratingSum += isApp ? out.rating : 0;
      cs.ratingCount += isApp ? 1 : 0;
      cs.motm += out.motm ? 1 : 0;
      cs.teamWins += out.teamResult === "W" ? 1 : 0;
      cs.teamDraws += out.teamResult === "D" ? 1 : 0;
      cs.teamLosses += out.teamResult === "L" ? 1 : 0;
      cs.teamGoalsFor += out.team_goals;
      cs.teamGoalsAgainst += out.opp_goals;

      if (isApp) careerApps++;
      const prevGoals = careerGoals;
      careerGoals += out.goals;
      careerAssists += out.assists;
      if (out.cleanSheet) careerCleanSheets++;

      // Check goal milestones
      for (const mark of [10, 25, 50, 100, 200, 300]) {
        if (prevGoals < mark && careerGoals >= mark) {
          milestones.push({
            id: `ms-${Date.now()}-${simulated}-${mark}`,
            type: "goals",
            label: `Mencapai ${mark} gol karier`,
            season: seasonIdx,
          });
        }
      }

      // Create spinLog entry
      const logId = `log-${Date.now()}-${simulated}`;
      const summary = out.selection === "injured"
        ? `Cedera, absen â€¢ ${out.teamResult} ${out.team_goals}-${out.opp_goals}`
        : out.selection === "suspended"
          ? `Sanksi kartu, absen â€¢ ${out.teamResult} ${out.team_goals}-${out.opp_goals}`
          : `${out.teamResult} ${out.team_goals}-${out.opp_goals} â€¢ ${out.goals}G ${out.assists}A rating ${out.rating}`;
      spinLog.unshift({
        id: logId,
        type: "match",
        season: seasonIdx,
        at: Date.now(),
        summary,
        opponentName: opp.name,
        matchType: comp.format === "league" ? "League" : comp.name,
      });

      // Generate news
      const resultKey = out.red
        ? "card_red"
        : out.teamResult === "L" ? "loss"
        : out.teamResult === "D" ? "draw"
        : out.teamResult === "W"
          ? out.goals >= 3 ? "hattrick"
          : out.goals === 2 ? "brace"
          : out.goals === 1 ? "goal"
          : out.assists >= 2 ? "assist"
          : "win"
        : out.motm ? "motm" : "draw";
      const newsTemplates: Record<string, string[]> = {
        win: ["{player} bawa {club} menang {goalsFor}-{goalsAgainst} vs {opp}! Rating {rating}."],
        draw: ["{club} seri {goalsFor}-{goalsAgainst} vs {opp}. {player} rating {rating}."],
        loss: ["{club} kalah {goalsFor}-{goalsAgainst} dari {opp}. {player} rating {rating}."],
        goal: ["{player} cetak gol! {club} menang {goalsFor}-{goalsAgainst} vs {opp}. Rating {rating}."],
        brace: ["Brace {player}! {club} hancurkan {opp} {goalsFor}-{goalsAgainst}. Rating {rating}."],
        hattrick: ["HAT-TRICK {player}!!! {club} gulingkan {opp} {goalsFor}-{goalsAgainst}. Rating {rating}."],
        assist: ["{player} assist {assists}x, {club} menang {goalsFor}-{goalsAgainst} vs {opp}. Rating {rating}."],
        motm: ["{player} Man of the Match! {club} {goalsFor}-{goalsAgainst} {opp}. Rating {rating}."],
        card_red: ["{player} kartu merah! {club} {goalsFor}-{goalsAgainst} {opp}. Rating {rating}."],
      };
      const tpls = newsTemplates[resultKey] ?? newsTemplates["draw"];
      const tpl = tpls[0];
      const newsTitle = tpl
        .replace("{player}", save.player.name)
        .replace("{club}", club.name)
        .replace("{opp}", opp.name)
        .replace("{goalsFor}", String(out.team_goals))
        .replace("{goalsAgainst}", String(out.opp_goals))
        .replace("{goals}", String(out.goals))
        .replace("{assists}", String(out.assists))
        .replace("{rating}", String(out.rating));
      newsArr.unshift({
        id: `news-${Date.now()}-${simulated}`,
        title: newsTitle,
        body: `${club.short} ${out.team_goals}-${out.opp_goals} ${opp.short} â€¢ Musim ${seasonIdx}, Pekan ${matchday}`,
        tag: "match",
        season: seasonIdx,
        matchday,
      });

      // Generate social
      const socialKey = out.goals >= 3 ? "hattrick" : out.goals > 0 ? "goal" : out.teamResult === "W" ? "win" : out.teamResult === "L" ? "loss" : "draw";
      const socialTemplates: Record<string, string[]> = {
        win: ["Kemenangan tim! {goals} gol buat kemenangan. Bangga bisa bantu {club} menang!"],
        draw: ["Seri aja ya... {goals} gol buat tim. Butuh evaluasi buat match depan. {club}"],
        loss: ["Kalah {goalsFor}-{goalsAgainst}... {goals} gol tapi belum cukup. Bangkit lagi match depan. {club}"],
        hattrick: ["HAT-TRICK!!! 3 gol dalam satu match! Bangga bisa bawa {club} menang besar vs {opp}!"],
        goal: ["GOL! Cetak gol buat {club} vs {opp}! Tim menang, itu yang penting!"],
        assist: ["Assist buat kemenangan! {assists} assist, {club} menang vs {opp}! Tim dulu, individu kedua."],
      };
      const stpls = socialTemplates[socialKey] ?? socialTemplates["win"];
      const socialContent = stpls[0]
        .replace("{player}", save.player.name)
        .replace("{club}", club.name)
        .replace("{opp}", opp.name)
        .replace("{goals}", String(out.goals))
        .replace("{assists}", String(out.assists))
        .replace("{goalsFor}", String(out.team_goals))
        .replace("{goalsAgainst}", String(out.opp_goals));
      const likes = Math.floor(Math.random() * 5000) + 500;
      socialArr.unshift({
        id: `social-${Date.now()}-${simulated}`,
        content: socialContent,
        season: seasonIdx,
        matchday,
        likes,
        comments: Math.floor(likes * (0.05 + Math.random() * 0.15)),
        reposts: Math.floor(likes * (0.02 + Math.random() * 0.08)),
      });

      // Followers
      const played = out.selection === "starter" || out.selection === "sub";
      followers += Math.max(0, out.goals * 8000 + (out.motm ? 15000 : 0) + (played ? 500 : 0));

      // Handle suspensions/injuries for next match
      if (suspendedMatches > 0) suspendedMatches--;
      else if (out.red) suspendedMatches = 1;

      if (injuredMatches > 0) injuredMatches--;
      else if (out.injuryMatches > 0) injuredMatches = out.injuryMatches;

      // Auto-advance knockout competitions
      if (comp.format !== "league" && m.stage) {
        const stages = comp.rounds ?? [];
        const idx = stages.indexOf(m.stage);
        if (out.teamResult === "W" && idx >= 0 && idx < stages.length - 1) {
          const nextStage = stages[idx + 1];
          const allClubs = await (await import("../services/reference-cache.js")).getClubs();
          const rng = rngFor(seed, "ko-adv", m.id, nextStage);
          const pool = allClubs.filter((c) => c.id !== club.id && c.tier <= 3);
          const nextOpp = pool[Math.floor(rng() * pool.length)];
          await query(
            `INSERT INTO matches (save_id, season_idx, competition_id, stage, order_key, opponent_club_id, home)
             VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(order_key), 0) + 1 FROM matches WHERE save_id = $1 AND season_idx = $2), $5, $6)`,
            [req.params.id, seasonIdx, comp.id, nextStage, nextOpp.id, rng() < 0.5],
          );
          await query(
            `UPDATE season_competitions SET current_stage = $1 WHERE save_id = $2 AND season_idx = $3 AND competition_id = $4`,
            [nextStage, req.params.id, seasonIdx, comp.id],
          );
        } else if (out.teamResult !== "W" && comp.format === "knockout") {
          await query(
            `UPDATE season_competitions SET eliminated_at = $1 WHERE save_id = $2 AND season_idx = $3 AND competition_id = $4`,
            [m.stage, req.params.id, seasonIdx, comp.id],
          );
        }
      }

      simulated++;
    }

    // Write updated saves.data in one shot
    const updatedData = {
      ...save,
      updatedAt: Date.now(),
      season: {
        ...save.season,
        matchday,
        currentStats: cs,
      },
      careerStats: {
        apps: careerApps,
        goals: careerGoals,
        assists: careerAssists,
        cleanSheets: careerCleanSheets,
        trophies: save.careerStats?.trophies ?? 0,
        awards: save.careerStats?.awards ?? 0,
      },
      spinLog,
      news: newsArr.slice(0, 200),
      social: socialArr.slice(0, 200),
      followers,
      milestones,
      suspendedMatches,
      injuredMatches,
    };
    await query(
      `UPDATE saves SET data = $1::jsonb WHERE id = $2`,
      [JSON.stringify(updatedData), req.params.id],
    );

    res.json({ simulated, message: `Simulated ${simulated} matches to end of season` });
  } catch (err) {
    console.error("Simulate season error:", err);
    res.status(500).json({ error: "Simulation failed", detail: String(err) });
  }
});

// ----- Awards preview & commit -----
gameRouter.get("/saves/:id/season/:idx/awards/preview", async (req, res) => {
  const { rows } = await query<any>("SELECT id, data FROM saves WHERE id = $1", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: "Save not found" });
  const save = rows[0].data;
  const agg = await computePlayerAgg({
    id: save.id,
    season_index: Number(req.params.idx),
    player: save.player,
    attributes: save.attributes,
    current_club_id: save.currentClub.clubId,
  });
  const previewSeed = Number(req.query.previewSeed ?? save.seed ?? 1);
  const trophies = await computeSeasonTrophies(agg, previewSeed);
  const awards = await computeSeasonAwards(agg, previewSeed);
  res.json({ agg, trophies, awards, previewSeed });
});

gameRouter.post("/saves/:id/season/:idx/awards/commit", async (req, res) => {
  const previewSeed = Number(req.body?.previewSeed ?? 0);
  const { rows } = await query<any>("SELECT id, data FROM saves WHERE id = $1", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: "Save not found" });
  const save = rows[0].data;
  const seasonIdx = Number(req.params.idx);

  const agg = await computePlayerAgg({
    id: save.id,
    season_index: seasonIdx,
    player: save.player,
    attributes: save.attributes,
    current_club_id: save.currentClub.clubId,
  });
  const trophies = await computeSeasonTrophies(agg, previewSeed || (save.seed ?? 1));
  const awards = await computeSeasonAwards(agg, previewSeed || (save.seed ?? 1));

  await query("DELETE FROM trophies WHERE save_id = $1 AND season_idx = $2", [save.id, seasonIdx]);
  await query("DELETE FROM awards_won WHERE save_id = $1 AND season_idx = $2", [
    save.id,
    seasonIdx,
  ]);
  await query("DELETE FROM award_nominees WHERE save_id = $1 AND season_idx = $2", [
    save.id,
    seasonIdx,
  ]);

  for (const t of trophies) {
    await query(
      "INSERT INTO trophies (save_id, season_idx, competition_id, club_id) VALUES ($1, $2, $3, $4)",
      [save.id, seasonIdx, t.competition_id, t.club_id],
    );
  }
  for (const a of awards) {
    await query(
      `INSERT INTO awards_won (save_id, season_idx, award_id, club_id, detail, rank_position)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        save.id,
        seasonIdx,
        a.award_id,
        a.winner_is_you ? save.currentClub.clubId : (a.winner_club_id ?? null),
        a.detail,
        a.your_rank,
      ],
    );
    for (const n of a.nominees) {
      await query(
        `INSERT INTO award_nominees (save_id, season_idx, award_id, rank_position, player_name, club_id, is_you, stats)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          save.id,
          seasonIdx,
          a.award_id,
          n.rank,
          n.name,
          n.club_id ?? null,
          n.is_you,
          n.stats ? JSON.stringify(n.stats) : null,
        ],
      );
    }
  }
  res.json({ trophies, awardsCount: awards.length });
});

// ----- Read: trophies & awards for a save -----
gameRouter.get("/saves/:id/trophies", async (req, res) => {
  const { rows } = await query<any>(
    `SELECT t.*, c.name AS comp_name, c.short AS comp_short, c.scope AS comp_scope,
            cl.name AS club_name, cl.short AS club_short
     FROM trophies t
     JOIN competitions c ON c.id = t.competition_id
     JOIN clubs cl ON cl.id = t.club_id
     WHERE t.save_id = $1
     ORDER BY t.season_idx ASC, c.scope`,
    [req.params.id],
  );
  res.json(rows);
});

gameRouter.get("/saves/:id/awards", async (req, res) => {
  const { rows } = await query<any>(
    `SELECT aw.*, a.name AS award_name, a.icon AS award_icon, a.scope AS award_scope
     FROM awards_won aw
     JOIN awards a ON a.id = aw.award_id
     WHERE aw.save_id = $1
     ORDER BY aw.season_idx ASC`,
    [req.params.id],
  );
  res.json(rows);
});

gameRouter.get("/saves/:id/season/:idx/nominees", async (req, res) => {
  const { rows } = await query<any>(
    `SELECT n.*, a.name AS award_name, a.icon AS award_icon, cl.short AS club_short, cl.name AS club_name
FROM award_nominees n
      JOIN awards a ON a.id = n.award_id
      LEFT JOIN clubs cl ON cl.id = n.club_id
      WHERE n.save_id = $1 AND n.season_idx = $2
      ORDER BY n.award_id, n.rank_position`,
    [req.params.id, req.params.idx],
  );
  res.json(rows);
});

// ----- Simulate remaining matches to end of season -----

