import { Router } from "express";
import { query } from "../db.js";
import { footballApi } from "../football-api.js";

export const fixturesRouter = Router();

type RapidFixture = Awaited<ReturnType<typeof footballApi.getFixturesByDate>>[number];

function toDateKey(date: string) {
  return date.includes("-") ? date : `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
}

function toApiDate(date: string) {
  return date.replaceAll("-", "");
}

function mapFixture(fixture: RapidFixture) {
  const kickoffAt = new Date(fixture.timeTS).toISOString();
  return {
    id: fixture.id,
    leagueId: fixture.leagueId,
    leagueName: `League ${fixture.leagueId}`,
    matchDate: kickoffAt.slice(0, 10),
    kickoffAt,
    homeTeamId: fixture.home.id,
    homeTeamName: fixture.home.longName || fixture.home.name,
    homeScore: fixture.home.score ?? 0,
    awayTeamId: fixture.away.id,
    awayTeamName: fixture.away.longName || fixture.away.name,
    awayScore: fixture.away.score ?? 0,
    statusId: fixture.statusId,
    statusText: fixture.status.scoreStr ?? (fixture.status.finished ? "Finished" : fixture.status.started ? "Live" : "Scheduled"),
    tournamentStage: fixture.tournamentStage,
    raw: fixture,
  };
}

async function upsertFixtures(dateKey: string, fixtures: RapidFixture[]) {
  for (const fixture of fixtures) {
    const kickoffAt = new Date(fixture.timeTS).toISOString();
    const matchDate = kickoffAt.slice(0, 10);

    await query(
      `INSERT INTO fixtures (
        id, league_id, league_name, match_date, kickoff_at,
        home_team_id, home_team_name, home_score,
        away_team_id, away_team_name, away_score,
        status_id, status_text, tournament_stage, raw, updated_at
      ) VALUES (
        $1, $2, $3, $4::date, $5::timestamptz,
        $6, $7, $8,
        $9, $10, $11,
        $12, $13, $14, $15::jsonb, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        league_id = EXCLUDED.league_id,
        league_name = EXCLUDED.league_name,
        match_date = EXCLUDED.match_date,
        kickoff_at = EXCLUDED.kickoff_at,
        home_team_id = EXCLUDED.home_team_id,
        home_team_name = EXCLUDED.home_team_name,
        home_score = EXCLUDED.home_score,
        away_team_id = EXCLUDED.away_team_id,
        away_team_name = EXCLUDED.away_team_name,
        away_score = EXCLUDED.away_score,
        status_id = EXCLUDED.status_id,
        status_text = EXCLUDED.status_text,
        tournament_stage = EXCLUDED.tournament_stage,
        raw = EXCLUDED.raw,
        updated_at = NOW()`,
      [
        fixture.id,
        fixture.leagueId,
        `League ${fixture.leagueId}`,
        matchDate,
        kickoffAt,
        fixture.home.id,
        fixture.home.longName || fixture.home.name,
        fixture.home.score ?? 0,
        fixture.away.id,
        fixture.away.longName || fixture.away.name,
        fixture.away.score ?? 0,
        fixture.statusId,
        fixture.status.scoreStr ?? null,
        fixture.tournamentStage,
        JSON.stringify(fixture),
      ],
    );
  }

  return dateKey;
}

fixturesRouter.get("/fixtures", async (req, res) => {
  try {
    const dateParam = typeof req.query.date === "string" ? req.query.date : "";
    const leagueParam = typeof req.query.league === "string" ? req.query.league : "";
    const refresh = req.query.refresh === "true";

    if (!dateParam) {
      return res.status(400).json({ error: "date query param is required" });
    }

    const dateKey = toDateKey(dateParam);
    const leagueId = leagueParam ? Number(leagueParam) : null;

    const params: unknown[] = [dateKey];
    let sql = `
      SELECT
        f.id,
        f.league_id AS "leagueId",
        COALESCE(l.name, f.league_name) AS "leagueName",
        f.match_date AS "matchDate",
        f.kickoff_at AS "kickoffAt",
        f.home_team_id AS "homeTeamId",
        f.home_team_name AS "homeTeamName",
        f.home_score AS "homeScore",
        f.away_team_id AS "awayTeamId",
        f.away_team_name AS "awayTeamName",
        f.away_score AS "awayScore",
        f.status_id AS "statusId",
        f.status_text AS "statusText",
        f.tournament_stage AS "tournamentStage"
      FROM fixtures f
      LEFT JOIN leagues l ON l.id::bigint = f.league_id
      WHERE f.match_date = $1::date`;

    if (leagueId) {
      params.push(leagueId);
      sql += ` AND league_id = $${params.length}`;
    }

    sql += " ORDER BY kickoff_at ASC";

    const { rows: cachedRows } = await query(sql, params);
    if (cachedRows.length > 0 && !refresh) {
      return res.json(cachedRows);
    }

    const fixtures = await footballApi.getFixturesByDate(toApiDate(dateKey));
    const filteredFixtures = leagueId ? fixtures.filter((fixture) => fixture.leagueId === leagueId) : fixtures;

    await upsertFixtures(dateKey, filteredFixtures);

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch fixtures:", error);
    res.status(500).json({ error: "Failed to fetch fixtures" });
  }
});
