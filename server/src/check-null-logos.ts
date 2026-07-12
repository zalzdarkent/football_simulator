// Script to check which clubs have NULL logo_url
import { query } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🔍 Checking clubs with NULL logo_url...\n");

  try {
    const { rows } = await query(
      "SELECT id, name, league_id FROM clubs WHERE logo_url IS NULL ORDER BY league_id, name"
    );

    console.log(`Found ${rows.length} clubs without logos:\n`);

    const byLeague: Record<string, any[]> = {};
    rows.forEach((club: any) => {
      if (!byLeague[club.league_id]) byLeague[club.league_id] = [];
      byLeague[club.league_id].push(club);
    });

    Object.keys(byLeague).sort().forEach(league => {
      console.log(`\n${league.toUpperCase()}:`);
      byLeague[league].forEach((club: any) => {
        console.log(`  - ${club.name} (${club.id})`);
      });
    });

    console.log(`\n📊 Total: ${rows.length} clubs without logos`);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
