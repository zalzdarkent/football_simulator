import { query } from "./db.js";
import { footballApi } from "./football-api.js";
import { AWARDS } from "../../src/data/awards.ts"; // Use .ts for tsx

// Mapping of target countries requested by the user
const TARGET_COUNTRIES = {
  // Europe Top 10
  "England": "EN", "Spain": "ES", "Italy": "IT", "Germany": "DE", "France": "FR",
  "Netherlands": "NL", "Portugal": "PT", "Turkey": "TR", "Belgium": "BE", "Scotland": "SC",
  // Asia Top 5 + Indonesia + Australia
  "Saudi Arabia": "SA", "Japan": "JP", "South-Korea": "KR", "Australia": "AU", "Indonesia": "ID",
  // Americas Top 5
  "Brazil": "BR", "Argentina": "AR", "USA": "US", "Mexico": "MX", "Colombia": "CO",
  // Africa Top 3
  "Egypt": "EG", "Morocco": "MA", "South Africa": "ZA"
};

// Calculate tier based on country/league reputation roughly
function calculateTier(countryName: string): 1 | 2 | 3 | 4 {
  const elite = ["England", "Spain", "Italy", "Germany", "France"];
  const strong = ["Netherlands", "Portugal", "Brazil", "Argentina"];
  if (elite.includes(countryName)) return 1;
  if (strong.includes(countryName)) return 2;
  return 3;
}

// Generate colors based on club name (fallback)
function generateColors(): [string, string] {
  return ["#000000", "#FFFFFF"];
}

async function syncCountries() {
  console.log("🔄 Syncing countries from API...");
  try {
    const countries = await footballApi.getCountries();
    console.log(`Found ${countries.length} countries in API.`);
    
    let count = 0;
    for (const c of countries) {
      if (TARGET_COUNTRIES[c.name as keyof typeof TARGET_COUNTRIES]) {
        const codeToInsert = TARGET_COUNTRIES[c.name as keyof typeof TARGET_COUNTRIES];
        console.log(`Inserting: name=${c.name}, code=${codeToInsert}, flag=${c.flag}`);
        await query(
          "INSERT INTO countries (code, name, flag) VALUES ($1, $2, $3) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, flag = EXCLUDED.flag",
          [codeToInsert, c.name, c.flag || ""]
        );
        count++;
      }
    }
    console.log(`✅ Synced ${count} target countries.`);
  } catch (error) {
    console.error("❌ Error syncing countries:", error);
  }
}

async function syncLeagues() {
  console.log("🔄 Syncing leagues and domestic cups from API...");
  try {
    const allLeagues = await footballApi.getLeagues();
    console.log(`Found ${allLeagues.length} leagues/cups in API.`);

    const TARGET_LEAGUE_IDS = [
      39, 140, 135, 78, 61, 88, 94, 203, 144, 179, // Europe Top 10
      307, 98, 292, 188, 274, // Asia + Aus
      71, 128, 253, 262, 239, // Americas Top 5
      233, 200, 288 // Africa Top 3
    ];

    const targetCountryNames = Object.keys(TARGET_COUNTRIES);
    let leagueCount = 0;
    let cupCount = 0;
    const syncedCupsForCountry = new Set<string>();

    for (const item of allLeagues) {
      const countryName = item.country.name;
      if (!targetCountryNames.includes(countryName)) continue;
      
      const countryCode = TARGET_COUNTRIES[countryName as keyof typeof TARGET_COUNTRIES];
      
      if (item.league.type === "League" && TARGET_LEAGUE_IDS.includes(item.league.id)) {
        const shortName = item.league.name.substring(0, 8).toUpperCase();
        
        await query(
          "INSERT INTO leagues (id, name, country, short, country_code) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, country = EXCLUDED.country",
          [item.league.id.toString(), item.league.name, countryName, shortName, countryCode]
        );
        
        await query(
          `INSERT INTO competitions (id, name, short, scope, league_id, format, teams_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
          [item.league.id.toString(), item.league.name, shortName, "domestic-league", item.league.id.toString(), "league", 20]
        );
        leagueCount++;
      }
      
      if (item.league.type === "Cup" && !syncedCupsForCountry.has(countryName)) {
        const shortName = item.league.name.substring(0, 8).toUpperCase();
        const { rows } = await query("SELECT id FROM leagues WHERE country = $1 LIMIT 1", [countryName]);
        const leagueId = rows.length > 0 ? rows[0].id : null;

        if (leagueId) {
          let cupName = item.league.name;
          if (countryName === "Indonesia") cupName = "Loka Bhinneka";

          await query(
            `INSERT INTO competitions (id, name, short, scope, league_id, format, teams_count)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
            [item.league.id.toString(), cupName, shortName, "domestic-cup", leagueId, "knockout", 32]
          );
          cupCount++;
          syncedCupsForCountry.add(countryName);
        }
      }
    }
    console.log(`✅ Synced ${leagueCount} leagues and ${cupCount} cups.`);
  } catch (error) {
    console.error("❌ Error syncing leagues:", error);
  }
}

async function syncClubs() {
  console.log("🔄 Syncing clubs for all our synced leagues...");
  try {
    const { rows: leagues } = await query("SELECT id, country FROM leagues");
    console.log(`Found ${leagues.length} leagues in local DB.`);

    let totalClubs = 0;
    for (const lg of leagues) {
      console.log(`Fetching teams for league ${lg.id} (${lg.country})...`);
      try {
        const data = await footballApi.getTeamsById(Number(lg.id), 2024);
        const tier = calculateTier(lg.country);

        for (const teamItem of data) {
          const t = teamItem.team;
          const short = t.code || t.name.substring(0, 3).toUpperCase();
          const colors = generateColors();

          await query(
            `INSERT INTO clubs (id, name, short, league_id, city, tier, reputation, color_primary, color_secondary, logo_url, api_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, logo_url = EXCLUDED.logo_url`,
            [
              t.id.toString(), t.name, short, lg.id, teamItem.venue.city || "Unknown",
              tier, 70, colors[0], colors[1], t.logo, t.id
            ]
          );
          totalClubs++;
        }
        console.log(`  -> Synced ${data.length} clubs.`);
        // Sleep to respect rate limits
        await new Promise(res => setTimeout(res, 1500));
      } catch (err) {
        console.error(`  -> Failed to fetch teams for league ${lg.id}`, err);
      }
    }
    console.log(`✅ Synced total ${totalClubs} clubs.`);
  } catch (error) {
    console.error("❌ Error syncing clubs:", error);
  }
}

async function syncAwards() {
  console.log("🔄 Syncing local awards...");
  let count = 0;
  for (const award of Object.values(AWARDS)) {
    await query(
      `INSERT INTO awards (id, name, scope, icon) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, scope = EXCLUDED.scope, icon = EXCLUDED.icon`,
      [award.id, award.name, award.scope, award.icon]
    );
    count++;
  }
  console.log(`✅ Synced ${count} local awards.`);
}

async function main() {
  const args = process.argv.slice(2);
  const typeFlag = args.find(a => a.startsWith("--type="));
  const type = typeFlag ? typeFlag.split("=")[1] : null;

  if (!type) {
    console.error("Please specify what to sync: --type=countries | leagues | clubs | awards");
    process.exit(1);
  }

  switch (type) {
    case "countries":
      await syncCountries();
      break;
    case "leagues":
      await syncLeagues();
      break;
    case "clubs":
      await syncClubs();
      break;
    case "awards":
      await syncAwards();
      break;
    default:
      console.error(`Unknown sync type: ${type}`);
  }
  process.exit(0);
}

main();
