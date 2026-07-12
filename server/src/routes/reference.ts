import { Router } from "express";
import { query } from "../db.js";

export const referenceRouter = Router();

referenceRouter.get("/countries", async (_req, res) => {
  const { rows } = await query("SELECT code, name, flag FROM countries ORDER BY name");
  res.json(rows);
});

referenceRouter.get("/leagues", async (_req, res) => {
  const { rows } = await query(
    "SELECT id, name, country, short, country_code AS \"countryCode\" FROM leagues ORDER BY name",
  );
  res.json(rows);
});

referenceRouter.get("/clubs", async (req, res) => {
  const { league, tier } = req.query;
  let sql = `
    SELECT id, name, short, league_id AS league, city, tier, reputation,
           color_primary AS "colorPrimary", color_secondary AS "colorSecondary", logo_url AS "logoUrl"
    FROM clubs WHERE 1=1`;
  const params: unknown[] = [];
  if (league) {
    params.push(league);
    sql += ` AND league_id = $${params.length}`;
  }
  if (tier) {
    params.push(Number(tier));
    sql += ` AND tier = $${params.length}`;
  }
  sql += " ORDER BY reputation DESC, name";
  const { rows } = await query(sql, params);
  res.json(rows.map((r) => ({
    ...r,
    colors: [r.colorPrimary, r.colorSecondary],
  })));
});

referenceRouter.get("/clubs/:id", async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, short, league_id AS league, city, tier, reputation,
            color_primary AS "colorPrimary", color_secondary AS "colorSecondary", logo_url AS "logoUrl"
     FROM clubs WHERE id = $1`,
    [req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "Club not found" });
  const club = rows[0];
  res.json({ ...club, colors: [club.colorPrimary, club.colorSecondary] });
});

referenceRouter.get("/competitions", async (_req, res) => {
  const { rows } = await query(
    `SELECT id, name, short, scope, league_id AS league, region,
            tier_boost AS "tierBoost", format, teams_count AS "teamsCount", rounds
     FROM competitions ORDER BY scope, name`,
  );
  res.json(rows);
});

referenceRouter.get("/awards", async (_req, res) => {
  const { rows } = await query("SELECT id, name, scope, icon FROM awards ORDER BY name");
  res.json(rows);
});

// ─── Players ────────────────────────────────────────────────────────────────

// GET /api/players?club_id=&league_id=&season=&search=&limit=&offset=
referenceRouter.get("/players", async (req, res) => {
  const { club_id, league_id, season, search } = req.query;
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const offset = Number(req.query.offset ?? 0);

  const params: unknown[] = [];
  const conditions: string[] = [];

  if (club_id) {
    params.push(club_id);
    conditions.push(`p.club_id = $${params.length}`);
  }

  if (league_id) {
    params.push(league_id);
    conditions.push(`c.league_id = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`p.name ILIKE $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Build season join for player_stats
  let statsJoin = "";
  let statsSelect = "";
  if (season) {
    params.push(Number(season));
    statsJoin = `LEFT JOIN player_stats ps ON ps.player_id = p.id AND ps.season = $${params.length}`;
    statsSelect = `, ps.appearances, ps.goals, ps.assists, ps.minutes, ps.rating, ps.yellow_cards, ps.red_cards, ps.league_id AS stats_league_id`;
  }

  const sql = `
    SELECT
      p.id, p.name, p.firstname, p.lastname, p.age, p.nationality,
      p.position, p.club_id, p.photo_url AS "photoUrl",
      p.height, p.weight,
      c.name AS club_name, c.league_id, c.logo_url AS club_logo
      ${statsSelect}
    FROM players p
    LEFT JOIN clubs c ON c.id = p.club_id
    ${statsJoin}
    ${whereClause}
    ORDER BY p.name
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countSql = `
    SELECT COUNT(*)::text AS count
    FROM players p
    LEFT JOIN clubs c ON c.id = p.club_id
    ${whereClause}
  `;

  const [{ rows }, { rows: countRows }] = await Promise.all([
    query(sql, params),
    query<{ count: string }>(countSql, params.filter((_, i) => !season || i < params.length - 1)),
  ]);

  res.json({ players: rows, total: Number(countRows[0]?.count ?? 0) });
});

// GET /api/players/:id  — detail + all stats
referenceRouter.get("/players/:id", async (req, res) => {
  const { rows: playerRows } = await query(
    `SELECT
       p.id, p.name, p.firstname, p.lastname, p.age, p.nationality,
       p.position, p.club_id, p.photo_url AS "photoUrl", p.height, p.weight,
       c.name AS club_name, c.short AS club_short, c.league_id, c.logo_url AS club_logo,
       c.color_primary AS "colorPrimary", c.color_secondary AS "colorSecondary"
     FROM players p
     LEFT JOIN clubs c ON c.id = p.club_id
     WHERE p.id = $1`,
    [req.params.id]
  );

  if (!playerRows[0]) return res.status(404).json({ error: "Player not found" });

  const { rows: stats } = await query(
    `SELECT player_id, season, league_id, appearances, goals, assists,
            minutes, rating, yellow_cards AS "yellowCards", red_cards AS "redCards"
     FROM player_stats
     WHERE player_id = $1
     ORDER BY season DESC, league_id`,
    [req.params.id]
  );

  res.json({ ...playerRows[0], stats });
});

