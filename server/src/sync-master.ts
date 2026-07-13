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

async function syncCountries(forceSync: boolean = false) {
  console.log("🔄 Syncing countries from API...");
  
  // Check existing countries if not force sync
  let existingCountries = new Set<string>();
  if (!forceSync) {
    const { rows } = await query("SELECT code FROM countries");
    existingCountries = new Set(rows.map(r => r.code));
    console.log(`📋 Found ${existingCountries.size} existing countries in DB`);
  }
  
  try {
    const countries = await footballApi.getCountries();
    console.log(`Found ${countries.length} countries in API.`);
    
    const targetCountries = Object.entries(TARGET_COUNTRIES);
    const countriesToSync = targetCountries.filter(([name, code]) => 
      forceSync || !existingCountries.has(code)
    );
    
    if (countriesToSync.length === 0) {
      console.log(`✅ All ${targetCountries.length} target countries already synced!`);
      return;
    }
    
    console.log(`🔄 Need to sync: ${countriesToSync.length}/${targetCountries.length} countries`);
    console.log(`📝 Countries to sync: ${countriesToSync.map(([name]) => name).join(', ')}`);
    
    let count = 0;
    for (const c of countries) {
      if (TARGET_COUNTRIES[c.name as keyof typeof TARGET_COUNTRIES]) {
        const codeToInsert = TARGET_COUNTRIES[c.name as keyof typeof TARGET_COUNTRIES];
        
        if (forceSync || !existingCountries.has(codeToInsert)) {
          console.log(`Inserting: name=${c.name}, code=${codeToInsert}, flag=${c.flag}`);
          await query(
            "INSERT INTO countries (code, name, flag) VALUES ($1, $2, $3) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, flag = EXCLUDED.flag",
            [codeToInsert, c.name, c.flag || ""]
          );
          count++;
        }
      }
    }
    console.log(`✅ Synced ${count} countries.`);
  } catch (error) {
    console.error("❌ Error syncing countries:", error);
  }
}

async function syncLeagues(forceSync: boolean = false) {
  console.log("🔄 Syncing leagues and domestic cups from API...");
  
  // Check existing leagues if not force sync
  let existingLeagues = new Set<string>();
  let existingCompetitions = new Set<string>();
  if (!forceSync) {
    const { rows: leagues } = await query("SELECT id FROM leagues");
    const { rows: competitions } = await query("SELECT id FROM competitions");
    existingLeagues = new Set(leagues.map(r => r.id));
    existingCompetitions = new Set(competitions.map(r => r.id));
    console.log(`📋 Found ${existingLeagues.size} existing leagues, ${existingCompetitions.size} existing competitions in DB`);
  }
  
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
    let skippedLeagues = 0;
    let skippedCups = 0;
    const syncedCupsForCountry = new Set<string>();

    for (const item of allLeagues) {
      const countryName = item.country.name;
      if (!targetCountryNames.includes(countryName)) continue;
      
      const countryCode = TARGET_COUNTRIES[countryName as keyof typeof TARGET_COUNTRIES];
      const leagueIdStr = item.league.id.toString();
      
      if (item.league.type === "League" && TARGET_LEAGUE_IDS.includes(item.league.id)) {
        if (!forceSync && existingLeagues.has(leagueIdStr) && existingCompetitions.has(leagueIdStr)) {
          skippedLeagues++;
          continue;
        }
        
        const shortName = item.league.name.substring(0, 8).toUpperCase();
        
        await query(
          "INSERT INTO leagues (id, name, country, short, country_code) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, country = EXCLUDED.country",
          [leagueIdStr, item.league.name, countryName, shortName, countryCode]
        );
        
        await query(
          `INSERT INTO competitions (id, name, short, scope, league_id, format, teams_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
          [leagueIdStr, item.league.name, shortName, "domestic-league", leagueIdStr, "league", 20]
        );
        leagueCount++;
        console.log(`  ✅ League: ${item.league.name} (${countryName})`);
      }
      
      if (item.league.type === "Cup" && !syncedCupsForCountry.has(countryName)) {
        if (!forceSync && existingCompetitions.has(leagueIdStr)) {
          skippedCups++;
          syncedCupsForCountry.add(countryName); // Mark as processed to avoid checking again
          continue;
        }
        
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
            [leagueIdStr, cupName, shortName, "domestic-cup", leagueId, "knockout", 32]
          );
          cupCount++;
          syncedCupsForCountry.add(countryName);
          console.log(`  ✅ Cup: ${cupName} (${countryName})`);
        }
      }
    }
    
    console.log(`✅ Synced ${leagueCount} leagues and ${cupCount} cups.`);
    if (skippedLeagues > 0 || skippedCups > 0) {
      console.log(`⏭️  Skipped ${skippedLeagues} existing leagues and ${skippedCups} existing cups.`);
    }
  } catch (error) {
    console.error("❌ Error syncing leagues:", error);
  }
}

async function syncClubs(forceSync: boolean = false) {
  console.log("🔄 Syncing clubs for all our synced leagues...");
  
  // Get existing clubs if not force sync
  let existingClubs = new Set<string>();
  if (!forceSync) {
    const { rows } = await query("SELECT id FROM clubs WHERE api_id IS NOT NULL");
    existingClubs = new Set(rows.map(r => r.id));
    console.log(`📋 Found ${existingClubs.size} existing clubs in DB`);
  }
  
  try {
    const { rows: leagues } = await query("SELECT id, country FROM leagues");
    console.log(`Found ${leagues.length} leagues in local DB.`);

    let totalClubs = 0;
    let skippedClubs = 0;
    
    for (const lg of leagues) {
      console.log(`Checking teams for league ${lg.id} (${lg.country})...`);
      
      // Check if this league already has clubs
      if (!forceSync) {
        const { rows: leagueClubs } = await query(
          "SELECT COUNT(*)::int as count FROM clubs WHERE league_id = $1 AND api_id IS NOT NULL", 
          [lg.id]
        );
        
        if (leagueClubs[0].count >= 15) { // Assume 15+ clubs = league fully synced
          console.log(`  ⏭️  League ${lg.country} already has ${leagueClubs[0].count} clubs, skipping...`);
          skippedClubs += leagueClubs[0].count;
          continue;
        } else if (leagueClubs[0].count > 0) {
          console.log(`  🔄 League ${lg.country} has ${leagueClubs[0].count} clubs, will add missing ones...`);
        }
      }
      
      try {
        console.log(`  🌐 Fetching teams from API for ${lg.country}...`);
        const data = await footballApi.getTeamsById(Number(lg.id), 2024);
        const tier = calculateTier(lg.country);
        let newClubsInLeague = 0;

        for (const teamItem of data) {
          const t = teamItem.team;
          const clubId = t.id.toString();
          
          if (!forceSync && existingClubs.has(clubId)) {
            continue; // Skip existing club
          }
          
          const short = t.code || t.name.substring(0, 3).toUpperCase();
          const colors = generateColors();

          await query(
            `INSERT INTO clubs (id, name, short, league_id, city, tier, reputation, color_primary, color_secondary, logo_url, api_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, logo_url = EXCLUDED.logo_url, api_id = EXCLUDED.api_id`,
            [
              clubId, t.name, short, lg.id, teamItem.venue.city || "Unknown",
              tier, 70, colors[0], colors[1], t.logo, t.id
            ]
          );
          newClubsInLeague++;
          totalClubs++;
        }
        
        console.log(`  ✅ ${lg.country}: ${newClubsInLeague} new clubs synced (${data.length} total in API)`);
        
        // Sleep to respect rate limits
        await new Promise(res => setTimeout(res, 1500));
      } catch (err) {
        console.error(`  ❌ Failed to fetch teams for league ${lg.id} (${lg.country}):`, err);
        
        // If rate limit error, break to preserve requests
        if (err instanceof Error && err.message.includes('Rate limit')) {
          console.log(`  ⏸️  Rate limit reached. Stopping clubs sync.`);
          break;
        }
      }
    }
    
    console.log(`✅ Synced ${totalClubs} new clubs.`);
    if (skippedClubs > 0) {
      console.log(`⏭️  Skipped ${skippedClubs} existing clubs.`);
    }
  } catch (error) {
    console.error("❌ Error syncing clubs:", error);
  }
}

async function syncAwards(forceSync: boolean = false) {
  console.log("🔄 Syncing local awards...");
  
  // Check existing awards if not force sync
  let existingAwards = new Set<string>();
  if (!forceSync) {
    const { rows } = await query("SELECT id FROM awards");
    existingAwards = new Set(rows.map(r => r.id));
    console.log(`📋 Found ${existingAwards.size} existing awards in DB`);
  }
  
  const allAwards = Object.values(AWARDS);
  const awardsToSync = allAwards.filter(award => 
    forceSync || !existingAwards.has(award.id)
  );
  
  if (awardsToSync.length === 0) {
    console.log(`✅ All ${allAwards.length} awards already synced!`);
    return;
  }
  
  console.log(`🔄 Need to sync: ${awardsToSync.length}/${allAwards.length} awards`);
  
  let count = 0;
  for (const award of awardsToSync) {
    await query(
      `INSERT INTO awards (id, name, scope, icon) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, scope = EXCLUDED.scope, icon = EXCLUDED.icon`,
      [award.id, award.name, award.scope, award.icon]
    );
    count++;
    console.log(`  ✅ Award: ${award.name} (${award.scope})`);
  }
  console.log(`✅ Synced ${count} awards.`);
}

async function main() {
  const args = process.argv.slice(2);
  const typeFlag = args.find(a => a.startsWith("--type="));
  const forceFlag = args.find(a => a === "--force");
  
  const type = typeFlag ? typeFlag.split("=")[1] : null;
  const forceSync = !!forceFlag;

  if (!type) {
    console.error("Please specify what to sync: --type=countries | leagues | clubs | awards");
    console.error("Options:");
    console.error("  --force    Sync all items regardless of existing data");
    process.exit(1);
  }

  console.log(`🚀 Starting ${type} sync...`);
  console.log(`🔄 Force mode: ${forceSync ? 'ON (sync all)' : 'OFF (skip existing)'}`);
  console.log();

  switch (type) {
    case "countries":
      await syncCountries(forceSync);
      break;
    case "leagues":
      await syncLeagues(forceSync);
      break;
    case "clubs":
      await syncClubs(forceSync);
      break;
    case "awards":
      await syncAwards(forceSync);
      break;
    default:
      console.error(`Unknown sync type: ${type}`);
  }
  process.exit(0);
}

main();
