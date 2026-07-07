import { query, pool } from "./db.js";
import { COUNTRIES } from "../../src/data/countries.ts";
import { CLUBS, LEAGUES } from "../../src/data/clubs.ts";
import { AWARDS, COMPETITIONS } from "../../src/data/awards.ts";

export async function seed() {
  const { rows: countryRows } = await query<{ count: string }>("SELECT COUNT(*)::text AS count FROM countries");
  if (Number(countryRows[0].count) > 0) {
    console.log("Reference data already seeded, skipping.");
    return;
  }

  for (const c of COUNTRIES) {
    await query(
      "INSERT INTO countries (code, name, flag) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      [c.code, c.name, c.flag],
    );
  }

  for (const l of LEAGUES) {
    await query(
      "INSERT INTO leagues (id, name, country, short, country_code) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING",
      [l.id, l.name, l.country, l.short, l.countryCode],
    );
  }

  for (const club of CLUBS) {
    await query(
      `INSERT INTO clubs (id, name, short, league_id, city, tier, reputation, color_primary, color_secondary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
      [club.id, club.name, club.short, club.league, club.city, club.tier, club.reputation, club.colors[0], club.colors[1]],
    );
  }

  for (const comp of COMPETITIONS) {
    await query(
      `INSERT INTO competitions (id, name, short, scope, league_id, region, tier_boost)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
      [comp.id, comp.name, comp.short, comp.scope, comp.league ?? null, comp.region ?? null, comp.tierBoost],
    );
  }

  for (const award of Object.values(AWARDS)) {
    await query(
      "INSERT INTO awards (id, name, scope, icon) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
      [award.id, award.name, award.scope, award.icon],
    );
  }

  console.log(`Seeded ${COUNTRIES.length} countries, ${LEAGUES.length} leagues, ${CLUBS.length} clubs, ${COMPETITIONS.length} competitions, ${Object.keys(AWARDS).length} awards.`);
}
