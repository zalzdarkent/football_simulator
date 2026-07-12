// Script to fetch real football data from API-Football and sync to PostgreSQL database
// Run with: bun run sync:football (from server directory)

import { query } from "./db.js";
import { footballApi, LEAGUE_IDS, type LeagueCode } from "./football-api.js";
import dotenv from "dotenv";

dotenv.config();

// League codes to sync
const LEAGUES_TO_SYNC: LeagueCode[] = [
  "epl",
  "laliga", 
  "seriea",
  "bundesliga",
  "ligue1",
  "eredivisie",
  "liga-pt",
  "super-lig",
  "mls",
  "saudi",
];

// Calculate tier based on league
function calculateTier(leagueCode: LeagueCode): 1 | 2 | 3 | 4 {
  const topLeagues: LeagueCode[] = ["epl", "laliga", "seriea", "bundesliga", "ligue1"];
  const midLeagues: LeagueCode[] = ["eredivisie", "liga-pt", "super-lig"];
  const otherLeagues: LeagueCode[] = ["mls", "saudi"];

  if (topLeagues.includes(leagueCode)) return 1;
  if (midLeagues.includes(leagueCode)) return 2;
  if (otherLeagues.includes(leagueCode)) return 3;
  return 4;
}

// Calculate reputation based on tier and founded year
function calculateReputation(tier: number, founded?: number): number {
  const baseReputation = [95, 85, 75, 65];
  let reputation = baseReputation[tier - 1] || 70;
  
  if (founded && founded < 1900) reputation += 5;
  else if (founded && founded < 1950) reputation += 3;
  
  return Math.min(100, reputation);
}

// Generate colors based on club name (placeholder - would need real mapping)
function generateColors(clubName: string): [string, string] {
  const colorMap: Record<string, [string, string]> = {
    "Manchester City": ["#6CABDD", "#1C2C5B"],
    "Arsenal": ["#EF0107", "#FFFFFF"],
    "Liverpool": ["#C8102E", "#00B2A9"],
    "Manchester United": ["#DA291C", "#FBE122"],
    "Chelsea": ["#034694", "#FFFFFF"],
    "Tottenham Hotspur": ["#132257", "#FFFFFF"],
    "Newcastle United": ["#241F20", "#FFFFFF"],
    "Aston Villa": ["#95BFE5", "#7A003C"],
    "Brighton": ["#0057B8", "#FFCD00"],
    "West Ham": ["#7A263A", "#1BB1E7"],
    "Real Madrid": ["#FFFFFF", "#FEBE10"],
    "FC Barcelona": ["#A50044", "#004D98"],
    "Atlético Madrid": ["#CB3524", "#FFFFFF"],
    "Bayern Munich": ["#DC052D", "#FFFFFF"],
    "Borussia Dortmund": ["#FDE100", "#000000"],
    "Paris Saint-Germain": ["#004170", "#DA291C"],
    "Ajax": ["#D2122E", "#FFFFFF"],
    "PSV Eindhoven": ["#ED1C24", "#FFFFFF"],
    "Feyenoord": ["#CC0000", "#FFFFFF"],
    "Benfica": ["#E30613", "#FFFFFF"],
    "FC Porto": ["#00428C", "#FFFFFF"],
    "Sporting CP": ["#008057", "#FFFFFF"],
    "Galatasaray": ["#FDB913", "#A32638"],
    "Fenerbahçe": ["#FFED00", "#00234B"],
    "Inter Miami": ["#F7B5CD", "#231F20"],
    "Al Hilal": ["#005CB9", "#FFFFFF"],
    "Al Nassr": ["#FEC901", "#003DA5"],
  };
  
  return colorMap[clubName] || ["#000000", "#FFFFFF"];
}

// Mapping from API team names to frontend club IDs
const TEAM_ID_MAPPING: Record<string, string> = {
  "manchester-city": "man-city",
  "arsenal": "arsenal",
  "liverpool": "liverpool",
  "manchester-united": "man-utd",
  "chelsea": "chelsea",
  "tottenham-hotspur": "tottenham",
  "tottenham": "tottenham",
  "newcastle-united": "newcastle",
  "newcastle": "newcastle",
  "aston-villa": "aston-villa",
  "brighton-hove-albion": "brighton",
  "brighton": "brighton",
  "west-ham-united": "west-ham",
  "west-ham": "west-ham",
  "everton": "everton",
  "crystal-palace": "crystal-palace",
  "fulham": "fulham",
  "wolverhampton-wanderers": "wolves",
  "wolves": "wolves",
  "brentford": "brentford",
  "nottingham-forest": "nottm-forest",
  "real-madrid": "real-madrid",
  "fc-barcelona": "barcelona",
  "barcelona": "barcelona",
  "atletico-madrid": "atletico",
  "atletico": "atletico",
  "athletic-club": "athletic",
  "athletic": "athletic",
  "real-sociedad": "real-sociedad",
  "villarreal": "villarreal",
  "real-betis": "betis",
  "sevilla": "sevilla",
  "valencia": "valencia",
  "girona": "girona",
  "celta-vigo": "celta",
  "rcd-mallorca": "mallorca",
  "mallorca": "mallorca",
  "ca-osasuna": "osasuna",
  "osasuna": "osasuna",
  "rayo-vallecano": "rayo",
  "rayo": "rayo",
  "getafe": "getafe",
  "ud-almeria": "almeria",
  "almeria": "almeria",
  "cadiz": "cadiz",
  "inter": "inter",
  "juventus": "juventus",
  "ac-milan": "milan",
  "milan": "milan",
  "napoli": "napoli",
  "as-roma": "roma",
  "roma": "roma",
  "ss-lazio": "lazio",
  "lazio": "lazio",
  "atalanta": "atalanta",
  "acf-fiorentina": "fiorentina",
  "fiorentina": "fiorentina",
  "bologna": "bologna",
  "torino": "torino",
  "genoa": "genoa",
  "udinese": "udinese",
  "sassuolo": "sassuolo",
  "monza": "monza",
  "empoli": "empoli",
  "us-lecce": "lecce",
  "lecce": "lecce",
  "hellas-verona": "verona",
  "verona": "verona",
  "fc-bayern-munich": "bayern",
  "bayern": "bayern",
  "borussia-dortmund": "dortmund",
  "dortmund": "dortmund",
  "bayer-leverkusen": "leverkusen",
  "leverkusen": "leverkusen",
  "rb-leipzig": "rb-leipzig",
  "eintracht-frankfurt": "frankfurt",
  "frankfurt": "frankfurt",
  "vfb-stuttgart": "stuttgart",
  "stuttgart": "stuttgart",
  "vfl-wolfsburg": "wolfsburg",
  "wolfsburg": "wolfsburg",
  "borussia-mgladbach": "gladbach",
  "gladbach": "gladbach",
  "tsg-hoffenheim": "hoffenheim",
  "hoffenheim": "hoffenheim",
  "mainz-05": "mainz",
  "mainz": "mainz",
  "werder-bremen": "werder",
  "werder": "werder",
  "sc-freiburg": "freiburg",
  "freiburg": "freiburg",
  "fc-koln": "koln",
  "koln": "koln",
  "fc-augsburg": "augsburg",
  "augsburg": "augsburg",
  "vfl-bochum": "bochum",
  "bochum": "bochum",
  "darmstadt-98": "darmstadt",
  "paris-saint-germain": "psg",
  "psg": "psg",
  "olympique-marseille": "marseille",
  "marseille": "marseille",
  "as-monaco": "monaco",
  "monaco": "monaco",
  "olympique-lyonnais": "lyon",
  "lyon": "lyon",
  "lille": "lille",
  "ogc-nice": "nice",
  "nice": "nice",
  "stade-rennais": "rennes",
  "rennes": "rennes",
  "rc-lens": "lens",
  "lens": "lens",
  "fc-nantes": "nantes",
  "nantes": "nantes",
  "montpellier": "montpellier",
  "rc-strasbourg": "strasbourg",
  "strasbourg": "strasbourg",
  "toulouse": "toulouse",
  "stade-brestois": "brest",
  "brest": "brest",
  "stade-reims": "reims",
  "reims": "reims",
  "ajax": "ajax",
  "psv": "psv",
  "feyenoord": "feyenoord",
  "az-alkmaar": "az",
  "az": "az",
  "fc-twente": "twente",
  "twente": "twente",
  "fc-utrecht": "utrecht",
  "utrecht": "utrecht",
  "sc-heerenveen": "heerenveen",
  "heerenveen": "heerenveen",
  "sparta-rotterdam": "sparta",
  "sparta": "sparta",
  "nec-nijmegen": "nec",
  "nec": "nec",
  "go-ahead-eagles": "gae",
  "gae": "gae",
  "fortuna-sittard": "fortuna",
  "fortuna": "fortuna",
  "rkc-waalwijk": "rkc",
  "fc-volendam": "volendam",
  "almere-city": "almere",
  "pec-zwolle": "pec",
  "pec": "pec",
  "heracles": "heracles",
  "excelsior": "excelsior",
  "sl-benfica": "benfica",
  "benfica": "benfica",
  "fc-porto": "porto",
  "porto": "porto",
  "sporting-cp": "sporting",
  "sporting": "sporting",
  "sc-braga": "braga",
  "braga": "braga",
  "galatasaray": "galatasaray",
  "fenerbahce": "fenerbahce",
  "besiktas": "besiktas",
  "inter-miami": "inter-miami",
  "los-angeles-fc": "lafc",
  "lafc": "lafc",
  "la-galaxy": "la-galaxy",
  "new-york-city-fc": "nycfc",
  "nycfc": "nycfc",
  "al-hilal": "al-hilal",
  "al-nassr": "al-nassr",
  "al-ittihad": "al-ittihad",
  "al-ahli": "al-ahli",
};

// Generate safe ID from team name with mapping
function generateTeamId(teamName: string): string {
  const normalizedName = teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  
  return TEAM_ID_MAPPING[normalizedName] || normalizedName;
}

// Sync teams for a specific league
async function syncLeagueTeams(leagueCode: LeagueCode) {
  console.log(`🔄 Syncing ${leagueCode} teams...`);
  
  try {
    const teams = await footballApi.getTeams(leagueCode, 2024);
    console.log(`  Found ${teams.length} teams`);
    
    const tier = calculateTier(leagueCode);
    
    for (const team of teams) {
      const teamId = generateTeamId(team.team.name);
      const reputation = calculateReputation(tier, team.team.founded);
      const colors = generateColors(team.team.name);
      
      await query(
        `INSERT INTO clubs (id, name, short, league_id, city, tier, reputation, color_primary, color_secondary, logo_url, api_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           name = excluded.name,
           short = excluded.short,
           league_id = excluded.league_id,
           city = excluded.city,
           tier = excluded.tier,
           reputation = excluded.reputation,
           color_primary = excluded.color_primary,
           color_secondary = excluded.color_secondary,
           logo_url = excluded.logo_url,
           api_id = excluded.api_id`,
        [
          teamId,
          team.team.name,
          team.team.code || team.team.name.substring(0, 3).toUpperCase(),
          leagueCode,
          team.venue.city || "Unknown",
          tier,
          reputation,
          colors[0],
          colors[1],
          team.team.logo,
          team.team.id,            // numeric API ID stored for player sync later
        ]
      );
    }
    
    console.log(`  ✅ Synced ${teams.length} teams`);
  } catch (error) {
    console.error(`  ❌ Error syncing ${leagueCode}:`, error);
  }
  
  // Add delay to respect rate limits
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// Main sync function
async function main() {
  console.log("🚀 Starting football data sync to PostgreSQL...\n");
  
  // Check if API key is set
  const apiKey = process.env.VITE_FOOTBALL_API_KEY || process.env.FOOTBALL_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    console.error("❌ VITE_FOOTBALL_API_KEY or FOOTBALL_API_KEY not set in .env file");
    console.error("Please get your free API key from: https://www.api-football.com/");
    process.exit(1);
  }
  
  try {
    // Sync all leagues
    for (const leagueCode of LEAGUES_TO_SYNC) {
      await syncLeagueTeams(leagueCode);
    }
    
    // Get count of synced teams
    const { rows: countResult } = await query<{ count: string }>("SELECT COUNT(*)::text AS count FROM clubs WHERE logo_url IS NOT NULL");
    const syncedCount = Number(countResult[0].count);
    
    console.log("\n✅ Sync complete!");
    console.log(`📊 Total teams with logos: ${syncedCount}`);
    console.log("\n💡 Next steps:");
    console.log("1. Restart your server to use the new data");
    console.log("2. The UI will now display real club logos");
    console.log("3. Run this script periodically to update data");
    
  } catch (error) {
    console.error("\n❌ Error during sync:", error);
    process.exit(1);
  }
}

main();
