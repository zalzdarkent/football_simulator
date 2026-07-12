// Script to check Arsenal club data
import { query } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🔍 Checking Arsenal club data...\n");

  try {
    const { rows } = await query(
      "SELECT id, name, short, league_id, logo_url FROM clubs WHERE id = 'arsenal' OR name ILIKE '%arsenal%'"
    );

    if (rows.length === 0) {
      console.log("❌ Arsenal not found in database");
    } else {
      console.log(`Found ${rows.length} Arsenal records:\n`);
      rows.forEach((club: any) => {
        console.log(`ID: ${club.id}`);
        console.log(`Name: ${club.name}`);
        console.log(`Short: ${club.short}`);
        console.log(`League: ${club.league_id}`);
        console.log(`Logo URL: ${club.logo_url || 'NULL'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
