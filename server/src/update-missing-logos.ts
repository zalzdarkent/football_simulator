// Script to update missing logo URLs for clubs
import { query } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

// Manual logo URLs for clubs without logos from API
const MANUAL_LOGO_URLS: Record<string, string> = {
  "arsenal": "https://media.api-sports.io/football/teams/42.png",
  "tottenham": "https://media.api-sports.io/football/teams/47.png",
  "newcastle": "https://media.api-sports.io/football/teams/34.png",
  "bayern": "https://media.api-sports.io/football/teams/157.png",
  "gladbach": "https://media.api-sports.io/football/teams/165.png",
  "darmstadt": "https://media.api-sports.io/football/teams/169.png",
  "koln": "https://media.api-sports.io/football/teams/163.png",
  "mainz": "https://media.api-sports.io/football/teams/166.png",
  "hoffenheim": "https://media.api-sports.io/football/teams/168.png",
  "almere": "https://media.api-sports.io/football/teams/207.png",
  "excelsior": "https://media.api-sports.io/football/teams/209.png",
  "volendam": "https://media.api-sports.io/football/teams/210.png",
  "psv": "https://media.api-sports.io/football/teams/194.png",
  "rkc": "https://media.api-sports.io/football/teams/211.png",
  "cadiz": "https://media.api-sports.io/football/teams/543.png",
  "almeria": "https://media.api-sports.io/football/teams/545.png",
  "brest": "https://media.api-sports.io/football/teams/91.png",
  "la-galaxy": "https://media.api-sports.io/football/teams/1603.png",
  "al-ahli": "https://media.api-sports.io/football/teams/2925.png",
  "al-hilal": "https://media.api-sports.io/football/teams/2920.png",
  "al-ittihad": "https://media.api-sports.io/football/teams/2922.png",
  "sassuolo": "https://media.api-sports.io/football/teams/499.png",
  "besiktas": "https://media.api-sports.io/football/teams/645.png",
  "fenerbahce": "https://media.api-sports.io/football/teams/648.png",
};

async function main() {
  console.log("🔄 Updating missing logo URLs...\n");

  try {
    let updated = 0;

    for (const [clubId, logoUrl] of Object.entries(MANUAL_LOGO_URLS)) {
      const { rows } = await query(
        "UPDATE clubs SET logo_url = $1 WHERE id = $2 RETURNING name",
        [logoUrl, clubId]
      );

      if (rows.length > 0) {
        console.log(`✅ Updated: ${rows[0].name} (${clubId})`);
        updated++;
      } else {
        console.log(`⚠️ Skipped: ${clubId} (not found)`);
      }
    }

    console.log(`\n✅ Update complete!`);
    console.log(`📊 Updated: ${updated} clubs`);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
