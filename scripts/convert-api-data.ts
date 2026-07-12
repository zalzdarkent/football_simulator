// Utility to convert raw API data to existing app format
// Run with: bun scripts/convert-api-data.ts

import fs from "fs";
import path from "path";
import type { Club, LeagueId } from "../src/data/clubs";
import type { Country } from "../src/data/countries";

const DATA_DIR = path.join(process.cwd(), "src", "data");

// Read raw data files
function readJsonFile(filename: string) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filename}`);
    return null;
  }
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

// Map API league codes to app LeagueId
function mapLeagueCode(apiLeague: string): LeagueId {
  const leagueMap: Record<string, LeagueId> = {
    "Premier League": "epl",
    "La Liga": "laliga",
    "Serie A": "seriea",
    "Bundesliga": "bundesliga",
    "Ligue 1": "ligue1",
    "Eredivisie": "eredivisie",
    "Liga Portugal": "liga-pt",
    "Süper Lig": "super-lig",
    "MLS": "mls",
    "Saudi Pro League": "saudi",
  };
  return leagueMap[apiLeague] || "epl"; // Default to EPL if not found
}

// Generate tier based on league and reputation
function calculateTier(league: LeagueId): 1 | 2 | 3 | 4 {
  const topLeagues: LeagueId[] = ["epl", "laliga", "seriea", "bundesliga", "ligue1"];
  const midLeagues: LeagueId[] = ["eredivisie", "liga-pt", "super-lig"];
  const otherLeagues: LeagueId[] = ["mls", "saudi"];

  if (topLeagues.includes(league)) return 1;
  if (midLeagues.includes(league)) return 2;
  if (otherLeagues.includes(league)) return 3;
  return 4;
}

// Generate reputation score (simplified - could be enhanced with more data)
function calculateReputation(tier: number, founded?: number): number {
  const baseReputation = [95, 85, 75, 65]; // Base reputation per tier
  let reputation = baseReputation[tier - 1] || 70;
  
  // Boost for older clubs
  if (founded && founded < 1900) {
    reputation += 5;
  } else if (founded && founded < 1950) {
    reputation += 3;
  }
  
  return Math.min(100, reputation);
}

// Generate colors based on club name (simplified - would need real data)
function generateColors(clubName: string): [string, string] {
  // This is a placeholder - in reality you'd need a mapping or additional API
  const colorMap: Record<string, [string, string]> = {
    "Manchester City": ["#6CABDD", "#1C2C5B"],
    "Arsenal": ["#EF0107", "#FFFFFF"],
    "Liverpool": ["#C8102E", "#00B2A9"],
    "Manchester United": ["#DA291C", "#FBE122"],
    "Chelsea": ["#034694", "#FFFFFF"],
    "Real Madrid": ["#FFFFFF", "#FEBE10"],
    "FC Barcelona": ["#A50044", "#004D98"],
    "Bayern Munich": ["#DC052D", "#FFFFFF"],
    "Paris Saint-Germain": ["#004170", "#DA291C"],
  };
  
  return colorMap[clubName] || ["#000000", "#FFFFFF"];
}

// Convert raw team data to Club format
function convertTeamsToClubs(rawTeams: any[]): Club[] {
  return rawTeams.map((team) => {
    const leagueId = mapLeagueCode(team.country); // This is simplified
    const tier = calculateTier(leagueId);
    const reputation = calculateReputation(tier, team.founded);
    const colors = generateColors(team.name);
    
    // Generate a safe ID from the team name
    const id = team.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    
    return {
      id,
      name: team.name,
      short: team.code || team.name.substring(0, 3).toUpperCase(),
      league: leagueId,
      city: team.venue?.city || "Unknown",
      tier,
      reputation,
      colors,
      logoUrl: team.logo,
    };
  });
}

// Convert raw player data to a simplified format
function convertPlayers(rawPlayers: any[]) {
  return rawPlayers.map((player) => {
    const stats = player.statistics?.[0] || {};
    
    return {
      id: player.id,
      name: player.name,
      firstName: player.firstname,
      lastName: player.lastname,
      age: player.age,
      nationality: player.nationality,
      photo: player.photo,
      height: player.height,
      weight: player.weight,
      injured: player.injured,
      teamId: player.teamId,
      teamName: player.teamName,
      position: stats.games?.position || "Unknown",
      appearances: stats.games?.appearences || 0,
      goals: stats.goals?.total || 0,
      assists: stats.goals?.assists || 0,
      minutes: stats.games?.minutes || 0,
      rating: stats.games?.rating ? parseFloat(stats.games.rating) : 0,
    };
  });
}

// Convert raw league data
function convertLeagues(rawLeagues: any[]) {
  return rawLeagues.map((league) => ({
    id: league.code,
    name: league.name,
    country: league.country,
    short: league.name.substring(0, 3).toUpperCase(),
    countryCode: league.countryCode,
    logo: league.logo,
    flag: league.flag,
  }));
}

// Main conversion function
function main() {
  console.log("🔄 Converting API data to app format...\n");

  // Read raw data
  const rawTeams = readJsonFile("teams-raw.json");
  const rawPlayers = readJsonFile("players-raw.json");
  const rawLeagues = readJsonFile("leagues-raw.json");

  if (!rawTeams) {
    console.error("❌ No raw teams data found. Run fetch-football-data.ts first.");
    process.exit(1);
  }

  // Convert data
  console.log("📊 Converting teams...");
  const clubs = convertTeamsToClubs(rawTeams);
  console.log(`   Converted ${clubs.length} teams`);

  console.log("👥 Converting players...");
  const players = rawPlayers ? convertPlayers(rawPlayers) : [];
  console.log(`   Converted ${players.length} players`);

  console.log("🏆 Converting leagues...");
  const leagues = rawLeagues ? convertLeagues(rawLeagues) : [];
  console.log(`   Converted ${leagues.length} leagues`);

  // Save converted data
  console.log("\n💾 Saving converted data...");
  
  fs.writeFileSync(
    path.join(DATA_DIR, "clubs-from-api.json"),
    JSON.stringify(clubs, null, 2)
  );
  console.log("   Saved clubs-from-api.json");

  if (players.length > 0) {
    fs.writeFileSync(
      path.join(DATA_DIR, "players-from-api.json"),
      JSON.stringify(players, null, 2)
    );
    console.log("   Saved players-from-api.json");
  }

  if (leagues.length > 0) {
    fs.writeFileSync(
      path.join(DATA_DIR, "leagues-from-api.json"),
      JSON.stringify(leagues, null, 2)
    );
    console.log("   Saved leagues-from-api.json");
  }

  console.log("\n✅ Conversion complete!");
  console.log("\n📝 Next steps:");
  console.log("1. Review the converted data files");
  console.log("2. Manually merge or replace existing data files as needed");
  console.log("3. Update colors and other missing data manually");
  console.log("4. Test the application with the new data");
}

main();
