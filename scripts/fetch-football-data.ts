// RapidAPI football data fetcher
// Run with: bun scripts/fetch-football-data.ts

import fs from "fs";
import path from "path";
import { footballApi, LEAGUE_IDS, type LeagueCode } from "../server/src/football-api";

const OUTPUT_DIR = path.join(process.cwd(), "src", "data");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

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

async function fetchCountries() {
  console.log("🌍 Fetching countries...");
  const countries = await footballApi.getCountries();
  fs.writeFileSync(path.join(OUTPUT_DIR, "countries-raw.json"), JSON.stringify(countries, null, 2));
  console.log(`✅ Saved ${countries.length} countries to countries-raw.json`);
  return countries;
}

async function fetchLeagues() {
  console.log("\n🏆 Fetching leagues...");
  const leagues: any[] = [];

  for (const leagueCode of LEAGUES_TO_FETCH) {
    try {
      const league = await footballApi.getLeague(leagueCode);
      leagues.push({
        id: league.league.id.toString(),
        name: league.league.name,
        logo: league.league.logo,
        country: league.country.name,
        countryCode: league.country.code,
        code: leagueCode,
      });
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`  Error fetching ${leagueCode}:`, error);
    }
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, "leagues-raw.json"), JSON.stringify(leagues, null, 2));
  console.log(`✅ Saved ${leagues.length} leagues to leagues-raw.json`);
  return leagues;
}

async function fetchTeams() {
  console.log("\n🏟️  Fetching teams...");
  const allTeams: any[] = [];

  for (const leagueCode of LEAGUES_TO_FETCH) {
    try {
      const teams = await footballApi.getTeams(leagueCode);
      console.log(`  ${leagueCode}: ${teams.length} teams`);
      for (const team of teams) {
        allTeams.push({
          id: team.team.id.toString(),
          name: team.team.name,
          code: team.team.code,
          country: team.team.country,
          logo: team.team.logo,
          league: leagueCode,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`  Error fetching teams for ${leagueCode}:`, error);
    }
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, "teams-raw.json"), JSON.stringify(allTeams, null, 2));
  console.log(`✅ Saved ${allTeams.length} teams to teams-raw.json`);
  return allTeams;
}

async function fetchFixtures() {
  console.log("\n📅 Fetching fixtures...");
  const fixtures: any[] = [];

  for (const leagueCode of LEAGUES_TO_FETCH) {
    try {
      const leagueId = LEAGUE_IDS[leagueCode];
      const matches = await footballApi.getFixturesByLeagueId(leagueId);
      console.log(`  ${leagueCode}: ${matches.length} fixtures`);
      fixtures.push(...matches.map((match) => ({ ...match, leagueCode })));
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`  Error fetching fixtures for ${leagueCode}:`, error);
    }
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, "fixtures-raw.json"), JSON.stringify(fixtures, null, 2));
  console.log(`✅ Saved ${fixtures.length} fixtures to fixtures-raw.json`);
  return fixtures;
}

async function main() {
  console.log("🚀 Starting RapidAPI football data fetch...\n");

  const apiKey = process.env.RAPIDAPI_FOOTBALL_KEY || process.env.VITE_RAPIDAPI_FOOTBALL_KEY;
  if (!apiKey) {
    console.error("❌ RAPIDAPI_FOOTBALL_KEY not set in environment");
    process.exit(1);
  }

  try {
    const countries = await fetchCountries();
    const leagues = await fetchLeagues();
    const teams = await fetchTeams();
    const fixtures = await fetchFixtures();

    console.log("\n✨ Data fetch complete!");
    console.log("📊 Summary:");
    console.log(`   - ${countries.length} countries`);
    console.log(`   - ${leagues.length} leagues`);
    console.log(`   - ${teams.length} teams`);
    console.log(`   - ${fixtures.length} fixtures`);
  } catch (error) {
    console.error("\n❌ Error during data fetch:", error);
    process.exit(1);
  }
}

main();
