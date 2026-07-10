import { Router } from "express";
import { query } from "../db.js";
import { setupSeason } from "../services/season-setup.js";
import { simulateMatchDeterministic } from "../services/match-sim.js";
import { clubById, compById } from "../services/reference-cache.js";
import { computePlayerAgg, computeSeasonAwards, computeSeasonTrophies } from "../services/awards-engine.js";
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
  const saveRow = { id: save.id, seed, current_club_id: club.id, season_index: save.season?.index ?? 0 };
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
  const { rows: saveRows } = await query<any>("SELECT id, data FROM saves WHERE id = $1", [req.params.id]);
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

  const out = simulateMatchDeterministic(
    {
      overall: save.attributes.overall,
      position: save.player.position,
      age: save.player.age,
      club, opponent: opp, home: m.home, competition: comp,
      suspendedMatches: save.suspendedMatches ?? 0,
      injuredMatches: save.injuredMatches ?? 0,
    },
    save.seed ?? 1,
    m.id,
    previewSeed,
  );
  res.json({ match: m, opponent: opp, competition: comp, result: out, previewSeed });
});

// ----- Match commit -----
gameRouter.post("/saves/:id/matches/:mid/commit", async (req, res) => {
  const previewSeed = Number(req.body?.previewSeed ?? 0);
  const { rows: saveRows } = await query<any>("SELECT id, data FROM saves WHERE id = $1", [req.params.id]);
  if (!saveRows[0]) return res.status(404).json({ error: "Save not found" });
  const save = saveRows[0].data;
  const { rows: mRows } = await query<any>("SELECT * FROM matches WHERE id = $1 AND save_id = $2", [req.params.mid, req.params.id]);
  const m = mRows[0];
  if (!m) return res.status(404).json({ error: "Match not found" });
  if (m.played) return res.status(409).json({ error: "Match already played" });

  const club = await clubById(save.currentClub.clubId);
  const opp = await clubById(m.opponent_club_id);
  const comp = await compById(m.competition_id);
  if (!club || !opp || !comp) return res.status(400).json({ error: "Missing reference data" });

  const out = simulateMatchDeterministic(
    {
      overall: save.attributes.overall, position: save.player.position, age: save.player.age,
      club, opponent: opp, home: m.home, competition: comp,
      suspendedMatches: save.suspendedMatches ?? 0, injuredMatches: save.injuredMatches ?? 0,
    },
    save.seed ?? 1, m.id, previewSeed,
  );

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

  // Auto-advance knockout: if it's a KO match and we won, generate next-round match
  if (comp.format !== "league" && m.stage) {
    const stages = comp.rounds ?? [];
    const idx = stages.indexOf(m.stage);
    if (out.teamResult === "W" && idx >= 0 && idx < stages.length - 1) {
      const nextStage = stages[idx + 1];
      const allClubs = await (await import("../services/reference-cache.js")).getClubs();
      const rng = rngFor(save.seed ?? 1, "ko-adv", m.id, nextStage);
      const pool = allClubs.filter(c => c.id !== club.id && c.tier <= 3);
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

// ----- Awards preview & commit -----
gameRouter.get("/saves/:id/season/:idx/awards/preview", async (req, res) => {
  const { rows } = await query<any>("SELECT id, data FROM saves WHERE id = $1", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: "Save not found" });
  const save = rows[0].data;
  const agg = await computePlayerAgg({
    id: save.id, season_index: Number(req.params.idx),
    player: save.player, attributes: save.attributes,
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
    id: save.id, season_index: seasonIdx,
    player: save.player, attributes: save.attributes, current_club_id: save.currentClub.clubId,
  });
  const trophies = await computeSeasonTrophies(agg, previewSeed || (save.seed ?? 1));
  const awards = await computeSeasonAwards(agg, previewSeed || (save.seed ?? 1));

  await query("DELETE FROM trophies WHERE save_id = $1 AND season_idx = $2", [save.id, seasonIdx]);
  await query("DELETE FROM awards_won WHERE save_id = $1 AND season_idx = $2", [save.id, seasonIdx]);
  await query("DELETE FROM award_nominees WHERE save_id = $1 AND season_idx = $2", [save.id, seasonIdx]);

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
        save.id, seasonIdx, a.award_id,
        a.winner_is_you ? save.currentClub.clubId : (a.winner_club_id ?? null),
        a.detail, a.your_rank,
      ],
    );
    for (const n of a.nominees) {
      await query(
        `INSERT INTO award_nominees (save_id, season_idx, award_id, rank_position, player_name, club_id, is_you, stats)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [save.id, seasonIdx, a.award_id, n.rank, n.name, n.club_id ?? null, n.is_you, n.stats ? JSON.stringify(n.stats) : null],
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
