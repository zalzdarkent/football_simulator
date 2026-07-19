import { query, pool } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

const NUMERIC_LEAGUE_IDS = ['47', '87', '55', '54', '53', '57', '61', '71', '130', '536'];

async function main() {
  try {
    for (const table of ['competitions', 'season_competitions', 'matches', 'trophies', 'clubs']) {
      const col = table === 'clubs' ? 'league_id' : (table === 'competitions' ? 'league_id' : 'competition_id');
      const { rows } = await query(
        `SELECT COUNT(*) as count FROM ${table} WHERE ${col} IN (${NUMERIC_LEAGUE_IDS.map((_, i) => `$${i + 1}`).join(', ')})`,
        NUMERIC_LEAGUE_IDS
      );
      console.log(`Table ${table} has ${rows[0].count} rows referencing numeric league IDs`);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

main();
