// Script to fetch real football data from API-Football
// Run with: bun scripts/fetch-football-data.ts

import { footballApi, LEAGUE_IDS, type LeagueCode } from "../src/lib/football-api";
import fs from "fs";
import path from "path";

// Output directory
const OUTPUT_DIR = path.join(process.cwd(), "src", "data");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Leagues to fetch
const LEAGUES_TO_FETCH: LeagueCode[] = [
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

async function fetchAllTeams() {
  console.log("🏟️  Fetching teams from all leagues...");
  
  const allTeams: any[] = [];
  
  for (const leagueCode of LEAGUES_TO_FETCH) {
    try {
      console.log(`  Fetching ${leagueCode} teams...`);
      const teams = await footballApi.getTeams(leagueCode, 2024);
      console.log(`    Found ${teams.length} teams`);
      
      for (const team of teams) {
        allTeams.push({
          id: team.team.id.toString(),
          name: team.team.name,
          code: team.team.code,
          country: team.team.country,
          founded: team.team.founded,
          logo: team.team.logo,
          venue: {
            name: team.venue.name,
            city: team.venue.city,
            capacity: team.venue.capacity,
          },
          league: leagueCode,
        });
      }
      
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`    Error fetching ${leagueCode}:`, error);
    }
  }
  
  // Save teams data
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "teams-raw.json"),
    JSON.stringify(allTeams, null, 2)
  );
  console.log(`✅ Saved ${allTeams.length} teams to teams-raw.json`);
  
  return allTeams;
}

async function fetchPlayersForTeam(teamId: number, teamName: string) {
  try {
    console.log(`    Fetching players for ${teamName}...`);
    const players = await footballApi.getPlayers(teamId, 2024);
    console.log(`      Found ${players.length} players`);
    
    const playerData = players.map(p => ({
      id: p.player.id.toString(),
      name: p.player.name,
      firstname: p.player.firstname,
      lastname: p.player.lastname,
      age: p.player.age,
      nationality: p.player.nationality,
      photo: p.player.photo,
      height: p.player.height,
      weight: p.player.weight,
      injured: p.player.injured,
      teamId: teamId.toString(),
      teamName: teamName,
      statistics: p.statistics,
    }));
    
    return playerData;
  } catch (error) {
    console.error(`      Error fetching players for ${teamName}:`, error);
    return [];
  }
}

async function fetchAllPlayers(teams: any[]) {
  console.log("\n⚽ Fetching players from all teams...");
  
  const allPlayers: any[] = [];
  
  // Limit to first 5 teams per league to avoid rate limit issues
  const teamsToFetch = teams.slice(0, 50);
  
  for (const team of teamsToFetch) {
    const players = await fetchPlayersForTeam(parseInt(team.id), team.name);
    allPlayers.push(...players);
    
    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Save players data
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "players-raw.json"),
    JSON.stringify(allPlayers, null, 2)
  );
  console.log(`✅ Saved ${allPlayers.length} players to players-raw.json`);
  
  return allPlayers;
}

async function fetchLeagues() {
  console.log("\n🏆 Fetching league information...");
  
  const leagues: any[] = [];
  
  for (const leagueCode of LEAGUES_TO_FETCH) {
    try {
      console.log(`  Fetching ${leagueCode} info...`);
      const league = await footballApi.getLeague(leagueCode);
      
      leagues.push({
        id: league.league.id.toString(),
        name: league.league.name,
        type: league.league.type,
        logo: league.league.logo,
        country: league.country.name,
        countryCode: league.country.code,
        flag: league.country.flag,
        seasons: league.seasons,
        code: leagueCode,
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`    Error fetching ${leagueCode}:`, error);
    }
  }
  
  // Save leagues data
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "leagues-raw.json"),
    JSON.stringify(leagues, null, 2)
  );
  console.log(`✅ Saved ${leagues.length} leagues to leagues-raw.json`);
  
  return leagues;
}

async function fetchTopScorers() {
  console.log("\n🎯 Fetching top scorers...");
  
  const topScorers: any[] = [];
  
  for (const leagueCode of LEAGUES_TO_FETCH.slice(0, 5)) {
    try {
      console.log(`  Fetching ${leagueCode} top scorers...`);
      const scorers = await footballApi.getTopScorers(leagueCode, 2024);
      
      scorers.forEach(scorer => {
        topScorers.push({
          ...scorer,
          leagueCode,
        });
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`    Error fetching ${leagueCode} top scorers:`, error);
    }
  }
  
  // Save top scorers data
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "top-scorers-raw.json"),
    JSON.stringify(topScorers, null, 2)
  );
  console.log(`✅ Saved ${topScorers.length} top scorers to top-scorers-raw.json`);
  
  return topScorers;
}

async function main() {
  console.log("🚀 Starting football data fetch...\n");
  
  // Check if API key is set
  const apiKey = process.env.VITE_FOOTBALL_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    console.error("❌ VITE_FOOTBALL_API_KEY not set in .env file");
    console.error("Please get your free API key from: https://www.api-football.com/");
    process.exit(1);
  }
  
  try {
    // Fetch all data
    const teams = await fetchAllTeams();
    const leagues = await fetchLeagues();
    const players = await fetchAllPlayers(teams);
    const topScorers = await fetchTopScorers();
    
    console.log("\n✨ Data fetch complete!");
    console.log(`📊 Summary:`);
    console.log(`   - ${teams.length} teams`);
    console.log(`   - ${leagues.length} leagues`);
    console.log(`   - ${players.length} players`);
    console.log(`   - ${topScorers.length} top scorers`);
    
  } catch (error) {
    console.error("\n❌ Error during data fetch:", error);
    process.exit(1);
  }
}

main();
