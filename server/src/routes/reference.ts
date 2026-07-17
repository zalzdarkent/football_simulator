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