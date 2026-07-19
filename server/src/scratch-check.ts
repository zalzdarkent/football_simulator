import { query, pool } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  try {
    const { rows: leagues } = await query("SELECT id, name, country FROM leagues");
    console.log("--- LEAGUES IN DB ---");
    console.log(leagues);

    const { rows: clubCounts } = await query(
      "SELECT league_id, COUNT(*) as count FROM clubs GROUP BY league_id"
    );
    console.log("\n--- CLUBS PER LEAGUE ID IN DB ---");
    console.log(clubCounts);

    const { rows: sampleClubs } = await query(
      "SELECT id, name, league_id, api_id FROM clubs LIMIT 10"
    );
    console.log("\n--- SAMPLE CLUBS IN DB ---");
    console.log(sampleClubs);

  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

main();
