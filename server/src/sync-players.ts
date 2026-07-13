// Script to sync player data from API-Football to local PostgreSQL DB
// Run per-league to stay within free-tier API limit (100 req/day)
//
// Usage:
//   pnpm sync:players                                    → sync all leagues (use carefully!)
//   pnpm sync:players -- --league=epl                   → sync only EPL
//   pnpm sync:players -- --league=epl --threshold=20    → sync EPL, skip clubs with 20+ players
//   pnpm sync:players -- --league=epl --force           → sync all EPL clubs (ignore existing data)
//   pnpm sync:players -- --league=laliga --threshold=10 → sync La Liga, skip clubs with 10+ players
//
// Options:
//   --league=<code>     → Target specific league (epl, laliga, seriea, etc.)
//   --threshold=<num>   → Skip clubs with this many players or more (default: 15)
//   --force             → Sync all clubs regardless of existing data

import { query, pool } from "./db.js";
import { footballApi, LEAGUE_IDS, type LeagueCode } from "./football-api.js";
import dotenv from "dotenv";

dotenv.config();

const SEASON = 2024;
// Delay between requests to respect 10 req/min limit (free tier)
const DELAY_MS = 6500;

// Map API position strings to our short codes
function mapPosition(apiPosition: string | null): string {
  if (!apiPosition) return "MID";
  const pos = apiPosition.toLowerCase();
  if (pos === "goalkeeper") return "GK";
  if (pos === "defender") return "DEF";
  if (pos === "midfielder") return "MID";
  if (pos === "attacker") return "FWD";
  return "MID";
}

// Generate player ID from API numeric ID
function generatePlayerId(apiId: number): string {
  return `api-player-${apiId}`;
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ApiPlayerResponse {
  results: number;
  paging: { current: number; total: number };
  errors?: { requests?: string; [key: string]: any };
  response: Array<{
    player: {
      id: number;
      name: string;
      firstname: string;
      lastname: string;
      age: number;
      nationality: string;
      height: string;
      weight: string;
      photo: string;
    };
    statistics: Array<{
      team: { id: number; name: string };
      league: { id: number; name: string; season: number };
      games: {
        appearences: number;
        minutes: number;
        position: string;
        rating: string;
      };
      goals: { total: number; assists: number };
      cards: { yellow: number; red: number };
    }>;
  }>;
}

async function fetchPlayersPage(teamApiId: number, page: number): Promise<ApiPlayerResponse> {
  const url = new URL("https://v3.football.api-sports.io/players");
  url.searchParams.set("team", teamApiId.toString());
  url.searchParams.set("season", SEASON.toString());
  url.searchParams.set("page", page.toString());

  const apiKey = process.env.VITE_FOOTBALL_API_KEY || process.env.FOOTBALL_API_KEY;
  
  console.log(`      🔗 API URL: ${url.toString()}`);
  
  const res = await fetch(url.toString(), {
    headers: {
      "x-rapidapi-host": "v3.football.api-sports.io",
      "x-rapidapi-key": apiKey!,
    },
  });

  if (!res.ok) {
    console.log(`      ❌ HTTP ${res.status}: ${res.statusText}`);
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }

  const data = await res.json() as ApiPlayerResponse;
  
  // Check for rate limit errors
  if (data.errors && typeof data.errors === 'object' && 'requests' in data.errors) {
    console.log(`      ⚠️  Rate limit reached: ${data.errors.requests}`);
    throw new Error(`Rate limit: ${data.errors.requests}`);
  }
  
  console.log(`      📊 API Response: ${data.results} results, ${data.response?.length || 0} players in response`);
  
  return data;
}

// Sync all players for a single club
async function syncClubPlayers(
  club: { id: string; name: string; api_id: number; league_id: string },
  requestCount: { value: number }
) {
  console.log(`  👤 Fetching players for ${club.name} (API ID: ${club.api_id})...`);

  let page = 1;
  let totalInserted = 0;

  try {
    while (true) {
      const data = await fetchPlayersPage(club.api_id, page);
      requestCount.value++;

      const players = data.response;
      
      if (!players || players.length === 0) {
        console.log(`      ℹ️  No more players on page ${page}`);
        break;
      }

      for (const entry of players) {
        const { player, statistics } = entry;
        const playerId = generatePlayerId(player.id);

        // Find primary stat from the target team
        const primaryStat = statistics.find((s) => s.team.id === club.api_id) ?? statistics[0];
        const position = mapPosition(primaryStat?.games?.position ?? null);

        // Upsert player
        await query(
          `INSERT INTO players (id, name, firstname, lastname, age, nationality, position, club_id, photo_url, height, weight)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET
             name = excluded.name,
             firstname = excluded.firstname,
             lastname = excluded.lastname,
             age = excluded.age,
             nationality = excluded.nationality,
             position = excluded.position,
             club_id = excluded.club_id,
             photo_url = excluded.photo_url,
             height = excluded.height,
             weight = excluded.weight`,
          [
            playerId,
            player.name,
            player.firstname ?? null,
            player.lastname ?? null,
            player.age ?? null,
            player.nationality ?? null,
            position,
            club.id,
            player.photo ?? null,
            player.height ?? null,
            player.weight ?? null,
          ]
        );

        // Upsert player_stats for each stat entry
        for (const stat of statistics) {
          const leagueId =
            Object.entries(LEAGUE_IDS).find(([, apiId]) => apiId === stat.league.id)?.[0] ?? null;

          if (!leagueId) continue; // skip stats for leagues we don't track

          await query(
            `INSERT INTO player_stats (player_id, season, league_id, appearances, goals, assists, minutes, rating, yellow_cards, red_cards)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (player_id, season, league_id) DO UPDATE SET
               appearances = excluded.appearances,
               goals = excluded.goals,
               assists = excluded.assists,
               minutes = excluded.minutes,
               rating = excluded.rating,
               yellow_cards = excluded.yellow_cards,
               red_cards = excluded.red_cards`,
            [
              playerId,
              stat.league.season,
              leagueId,
              stat.games?.appearences ?? 0,
              stat.goals?.total ?? 0,
              stat.goals?.assists ?? 0,
              stat.games?.minutes ?? 0,
              stat.games?.rating ? parseFloat(stat.games.rating) : 0,
              stat.cards?.yellow ?? 0,
              stat.cards?.red ?? 0,
            ]
          );
        }

        totalInserted++;
      }

      console.log(`    Page ${page}/${data.paging.total} — ${players.length} players processed`);

      if (page >= data.paging.total) break;
      page++;

      // Respect rate limits between paginated requests
      if (page <= data.paging.total) {
        await delay(DELAY_MS);
      }
    }
  } catch (error) {
    console.error(`      ❌ Error fetching players for ${club.name}:`, error);
    // Don't throw - continue with next club
  }

  return totalInserted;
}

// Sync all clubs in a specific league
async function syncLeaguePlayers(
  leagueCode: LeagueCode, 
  requestCount: { value: number },
  playerThreshold: number = 15,
  forceSync: boolean = false
) {
  console.log(`\n🏟️  Syncing players for league: ${leagueCode.toUpperCase()}`);

  // Convert league code to numeric ID
  const leagueId = LEAGUE_IDS[leagueCode].toString();

  // Get all clubs for this league
  const { rows: allClubs } = await query<{
    id: string;
    name: string;
    api_id: number;
    league_id: string;
  }>(
    "SELECT id, name, api_id, league_id FROM clubs WHERE league_id = $1 AND api_id IS NOT NULL ORDER BY name",
    [leagueId]
  );

  if (allClubs.length === 0) {
    console.warn(`  ⚠️  No clubs with api_id found for ${leagueCode}. Run sync:football first.`);
    return 0;
  }

  // Check which clubs already have players synced
  const placeholders = allClubs.map((_, i) => `$${i + 1}`).join(',');
  const { rows: clubsWithPlayers } = await query<{
    club_id: string;
    player_count: number;
  }>(
    `SELECT club_id, COUNT(*)::int as player_count 
     FROM players 
     WHERE club_id IN (${placeholders}) 
     GROUP BY club_id`,
    allClubs.map(c => c.id)
  );

  const syncedClubIds = new Set(
    clubsWithPlayers
      .filter(c => c.player_count >= playerThreshold) // Use configurable threshold
      .map(c => c.club_id)
  );

  // Filter to clubs that need syncing (unless force mode)
  const clubsToSync = forceSync ? allClubs : allClubs.filter(club => !syncedClubIds.has(club.id));

  console.log(`  📊 Total clubs: ${allClubs.length}`);
  console.log(`  ✅ Already synced: ${syncedClubIds.size} clubs (${playerThreshold}+ players each)`);
  console.log(`  🔄 Need syncing: ${clubsToSync.length} clubs`);

  if (forceSync) {
    console.log(`  🚀 Force mode: Syncing ALL clubs regardless of existing data`);
  }

  if (clubsToSync.length === 0) {
    console.log(`  🎉 All clubs already synced for ${leagueCode}!`);
    return 0;
  }

  // Show which clubs will be synced
  console.log(`  📋 Clubs to sync: ${clubsToSync.map(c => c.name).join(', ')}`);

  let leagueTotal = 0;
  for (let i = 0; i < clubsToSync.length; i++) {
    const club = clubsToSync[i];
    try {
      const count = await syncClubPlayers(club, requestCount);
      leagueTotal += count;
      console.log(`  ✅ ${club.name}: ${count} players synced (req #${requestCount.value})`);
    } catch (err) {
      console.error(`  ❌ Error syncing ${club.name}:`, err);
      
      // If rate limit error, break early instead of continuing
      if (err instanceof Error && err.message.includes('Rate limit')) {
        console.log(`  ⏸️  Rate limit reached. Stopping sync to preserve requests.`);
        break;
      }
    }

    // Delay between clubs
    if (i < clubsToSync.length - 1) {
      console.log(`  ⏳ Waiting ${DELAY_MS / 1000}s before next club...`);
      await delay(DELAY_MS);
    }
  }

  return leagueTotal;
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const leagueArg = args.find((a) => a.startsWith("--league="));
  const thresholdArg = args.find((a) => a.startsWith("--threshold="));
  const forceArg = args.find((a) => a === "--force");
  
  const targetLeague = leagueArg ? (leagueArg.split("=")[1] as LeagueCode) : null;
  const playerThreshold = thresholdArg ? parseInt(thresholdArg.split("=")[1]) : 15;

  // Validate league arg
  if (targetLeague && !(targetLeague in LEAGUE_IDS)) {
    console.error(`❌ Unknown league: "${targetLeague}"`);
    console.error(`Valid leagues: ${Object.keys(LEAGUE_IDS).join(", ")}`);
    process.exit(1);
  }

  // Check API key
  const apiKey = process.env.VITE_FOOTBALL_API_KEY || process.env.FOOTBALL_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    console.error("❌ VITE_FOOTBALL_API_KEY or FOOTBALL_API_KEY not set in .env");
    process.exit(1);
  }

  console.log("🚀 Starting player sync to PostgreSQL...");
  if (targetLeague) {
    console.log(`📋 Target league: ${targetLeague}`);
  } else {
    console.log("📋 Syncing ALL leagues (this may exceed free-tier limit of 100 req/day!)");
  }
  console.log(`🎯 Player threshold: ${playerThreshold} (clubs with ${playerThreshold}+ players will be skipped)`);
  console.log(`🔄 Force mode: ${forceArg ? 'ON (sync all clubs)' : 'OFF (skip synced clubs)'}`);
  console.log();

  const requestCount = { value: 0 };
  let grandTotal = 0;

  try {
    if (targetLeague) {
      grandTotal = await syncLeaguePlayers(targetLeague, requestCount, playerThreshold, !!forceArg);
    } else {
      const leagues = Object.keys(LEAGUE_IDS).filter(
        (l) => !["ucl", "uel", "uecl"].includes(l)
      ) as LeagueCode[];

      for (const league of leagues) {
        grandTotal += await syncLeaguePlayers(league, requestCount, playerThreshold, !!forceArg);
      }
    }

    // Summary stats
    const { rows: playerCount } = await query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM players"
    );
    const { rows: statsCount } = await query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM player_stats"
    );

    console.log("\n✅ Sync complete!");
    console.log(`👤 Total players in DB:    ${playerCount[0].count}`);
    console.log(`📊 Total stat rows in DB:  ${statsCount[0].count}`);
    console.log(`🌐 API requests used:      ${requestCount.value}`);
    console.log("\n💡 Next: run the server and hit GET /api/players?league_id=<league>");
  } catch (err) {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
