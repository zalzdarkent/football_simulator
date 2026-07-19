import { query } from "./db.js";
import { footballApi, LEAGUE_IDS, API_ONLY_LEAGUE_IDS } from "./football-api.js";
import { LEAGUES, CLUBS } from "./data/clubs.js";
import { FALLBACK_CLUBS } from "./data/fallback-clubs.js";

function getDbLeagueId(apiLeagueId: number): string {
  const foundEntry = Object.entries(LEAGUE_IDS).find(([_, id]) => id === apiLeagueId);
  return foundEntry ? foundEntry[0] : apiLeagueId.toString();
}

const TARGET_COUNTRIES = [
  { name: "England", code: "EN", flagCode: "gb", aliases: ["England"] },
  { name: "Spain", code: "ES", flagCode: "es", aliases: ["Spain"] },
  { name: "Italy", code: "IT", flagCode: "it", aliases: ["Italy"] },
  { name: "Germany", code: "DE", flagCode: "de", aliases: ["Germany"] },
  { name: "France", code: "FR", flagCode: "fr", aliases: ["France"] },
  { name: "Netherlands", code: "NL", flagCode: "nl", aliases: ["Netherlands"] },
  { name: "Portugal", code: "PT", flagCode: "pt", aliases: ["Portugal"] },
  { name: "Turkey", code: "TR", flagCode: "tr", aliases: ["Turkey", "Turkiye"] },
  { name: "Belgium", code: "BE", flagCode: "be", aliases: ["Belgium"] },
  { name: "Scotland", code: "SC", flagCode: "gb", aliases: ["Scotland"] },
  { name: "Saudi Arabia", code: "SA", flagCode: "sa", aliases: ["Saudi Arabia"] },
  { name: "Japan", code: "JP", flagCode: "jp", aliases: ["Japan"] },
  { name: "South-Korea", code: "KR", flagCode: "kr", aliases: ["South-Korea", "South Korea"] },
  { name: "Australia", code: "AU", flagCode: "au", aliases: ["Australia"] },
  { name: "Indonesia", code: "ID", flagCode: "id", aliases: ["Indonesia"] },
  { name: "Brazil", code: "BR", flagCode: "br", aliases: ["Brazil"] },
  { name: "Argentina", code: "AR", flagCode: "ar", aliases: ["Argentina"] },
  { name: "USA", code: "US", flagCode: "us", aliases: ["USA", "United States"] },
  { name: "Mexico", code: "MX", flagCode: "mx", aliases: ["Mexico"] },
  { name: "Colombia", code: "CO", flagCode: "co", aliases: ["Colombia"] },
  { name: "Egypt", code: "EG", flagCode: "eg", aliases: ["Egypt"] },
  { name: "Morocco", code: "MA", flagCode: "ma", aliases: ["Morocco"] },
  { name: "South Africa", code: "ZA", flagCode: "za", aliases: ["South Africa"] },
] as const;

type TargetCountry = (typeof TARGET_COUNTRIES)[number];

const CONTINENTAL_COMPETITIONS = [
  { id: "ucl", name: "Champions League", short: "UCL" },
  { id: "uel", name: "Europa League", short: "UEL" },
  { id: "uecl", name: "Conference League", short: "UECL" },
];

const AWARDS = [
  { id: "golden-boot", name: "Golden Boot", scope: "season", icon: "🥇" },
  { id: "golden-glove", name: "Golden Glove", scope: "season", icon: "🧤" },
  { id: "tots", name: "Team of the Season", scope: "season", icon: "⭐" },
  { id: "poty-league", name: "Player of the Year", scope: "league", icon: "🏅" },
  { id: "best-young", name: "Best Young Player", scope: "season", icon: "🌱" },
  { id: "ballon-dor", name: "Ballon d'Or", scope: "global", icon: "🏆" },
  { id: "fifa-best", name: "The Best", scope: "global", icon: "🎖️" },
  { id: "uefa-poty", name: "UEFA POTY", scope: "continental", icon: "⚽" },
  { id: "ucl-poty", name: "UCL POTY", scope: "continental", icon: "✨" },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function buildFlagUrl(flagCode: string) {
  return `https://flagcdn.com/w40/${flagCode}.png`;
}

function calculateTier(countryName: string): 1 | 2 | 3 | 4 {
  const elite = ["England", "Spain", "Italy", "Germany", "France"];
  const strong = ["Netherlands", "Portugal", "Brazil", "Argentina"];
  if (elite.includes(countryName)) return 1;
  if (strong.includes(countryName)) return 2;
  return 3;
}

function shortName(name: string) {
  return normalize(name).slice(0, 8).toUpperCase();
}

function matchesCountryAlias(apiName: string, targetCountry: TargetCountry) {
  const normalizedApiName = normalize(apiName);
  return (
    targetCountry.aliases.some((alias) => normalize(alias) === normalizedApiName) ||
    normalize(targetCountry.name) === normalizedApiName
  );
}

function findTargetCountry(dbCountryName: string, dbCountryCode: string) {
  const normalizedCountryName = normalize(dbCountryName);
  const normalizedCountryCode = normalize(dbCountryCode);

  return (
    TARGET_COUNTRIES.find((country) => {
      const normalizedTargetName = normalize(country.name);
      if (normalizedTargetName === normalizedCountryName) return true;
      if (normalize(country.code) === normalizedCountryCode) return true;
      return country.aliases.some((alias) => normalize(alias) === normalizedCountryName);
    }) ?? null
  );
}

function findLeagueForCountry(
  catalog: Awaited<ReturnType<typeof footballApi.getLeagues>>,
  targetCountry: TargetCountry,
) {
  const matches = catalog.filter(
    (item) =>
      matchesCountryAlias(item.country.name, targetCountry) ||
      normalize(item.country.code) === normalize(targetCountry.code),
  );

  if (matches.length === 0) return null;

  const scoreLeague = (name: string): number => {
    const n = name.toLowerCase();
    let score = 0;

    // League keywords (+10 points)
    const leagueKeywords = [
      "league", "liga", "division", "serie", "bundesliga", "eredivisie",
      "premiership", "primera", "pro", "championship", "a-league",
      "j. league", "k league", "mls", "botola"
    ];
    if (leagueKeywords.some((kw) => n.includes(kw))) {
      score += 10;
    }

    // Cup/tournament keywords (-20 points)
    const cupKeywords = [
      "cup", "copa", "piala", "trophy", "shield", "supercup",
      "super cup", "play-off", "playoff", "friendlies",
      "championship play-offs", "relegation", "qualification", "cupa"
    ];
    if (cupKeywords.some((kw) => n.includes(kw))) {
      score -= 20;
    }

    return score;
  };

  // Sort matches by score descending
  matches.sort((a, b) => scoreLeague(b.league.name) - scoreLeague(a.league.name));

  return matches[0] ?? null;
}

function findCountryByApiName(apiName: string) {
  const normalizedName = normalize(apiName);
  return TARGET_COUNTRIES.find((country) =>
    country.aliases.some((alias) => normalize(alias) === normalizedName),
  );
}

async function syncCountries(forceSync = false) {
  console.log("🔄 Syncing countries from RapidAPI...");

  let existingCountries = new Set<string>();
  if (!forceSync) {
    const { rows } = await query("SELECT code FROM countries");
    existingCountries = new Set(rows.map((row) => row.code));
    console.log(`📋 Found ${existingCountries.size} existing countries in DB`);
  }

  try {
    const countries = await footballApi.getCountries();
    const countriesToSync = TARGET_COUNTRIES.filter(
      (country) => forceSync || !existingCountries.has(country.code),
    );

    if (countriesToSync.length === 0) {
      console.log(`✅ All ${TARGET_COUNTRIES.length} target countries already synced!`);
      return;
    }

    console.log(`🔄 Need to sync: ${countriesToSync.length}/${TARGET_COUNTRIES.length} countries`);
    console.log(
      `📝 Countries to sync: ${countriesToSync.map((country) => country.name).join(", ")}`,
    );

    let count = 0;
    for (const countryConfig of countriesToSync) {
      const apiCountry = countries.find(
        (item) => findCountryByApiName(item.name)?.name === countryConfig.name,
      );
      if (!apiCountry) continue;

      await query(
        `INSERT INTO countries (code, name, flag)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, flag = EXCLUDED.flag`,
        [countryConfig.code, countryConfig.name, buildFlagUrl(countryConfig.flagCode)],
      );
      count++;
      console.log(`  ✅ Country: ${countryConfig.name}`);
    }

    console.log(`✅ Synced ${count} countries.`);
  } catch (error) {
    console.error("❌ Error syncing countries:", error);
  }
}

async function syncLeagues(forceSync = false) {
  console.log("🔄 Syncing leagues and competitions from RapidAPI...");

  // Cleanup duplicate numeric leagues and their competitions
  const legacyNumericIds = ["47", "87", "55", "54", "53", "57", "61", "71", "130", "536"];
  try {
    await query("DELETE FROM competitions WHERE league_id = ANY($1) OR id = ANY($1)", [legacyNumericIds]);
    await query("DELETE FROM leagues WHERE id = ANY($1)", [legacyNumericIds]);
    console.log("🧹 Cleaned up legacy duplicate numeric leagues/competitions.");
  } catch (err) {
    console.warn("⚠️ Warning during legacy cleanup:", err);
  }

  let existingLeagues = new Set<string>();
  let existingCompetitions = new Set<string>();
  if (!forceSync) {
    const { rows: leagues } = await query("SELECT id FROM leagues");
    const { rows: competitions } = await query("SELECT id FROM competitions");
    existingLeagues = new Set(leagues.map((row) => row.id));
    existingCompetitions = new Set(competitions.map((row) => row.id));
    console.log(
      `📋 Found ${existingLeagues.size} existing leagues, ${existingCompetitions.size} existing competitions in DB`,
    );
  }

  try {
    const { rows: countries } = await query<{ code: string; name: string }>(
      "SELECT code, name FROM countries ORDER BY name",
    );
    const catalog = await footballApi.getLeagues();

    let leagueCount = 0;
    let cupCount = 0;
    let skippedCountries = 0;
    // Pre-populate with simulator league IDs so they're never pruned
    const syncedLeagueIds = new Set<string>(LEAGUES.map((l) => l.id));

    for (const country of countries) {
      const targetCountry = findTargetCountry(country.name, country.code);
      if (!targetCountry) {
        skippedCountries++;
        console.log(`  ⏭️  Skipping unsupported country in RapidAPI mapping: ${country.name}`);
        continue;
      }

      const league = findLeagueForCountry(catalog, targetCountry);
      if (!league) {
        skippedCountries++;
        console.log(`  ⏭️  No league found in RapidAPI catalog for ${country.name}`);
        continue;
      }

      const apiLeagueId = league.league.id;
      const leagueId = getDbLeagueId(apiLeagueId);
      const countryCode = country.code;
      syncedLeagueIds.add(leagueId);

      if (forceSync || !existingLeagues.has(leagueId)) {
        await query(
          `INSERT INTO leagues (id, name, country, short, country_code)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, country = EXCLUDED.country, short = EXCLUDED.short, country_code = EXCLUDED.country_code`,
          [leagueId, league.league.name, country.name, shortName(league.league.name), countryCode],
        );
      }

      if (forceSync || !existingCompetitions.has(leagueId)) {
        await query(
          `INSERT INTO competitions (id, name, short, scope, league_id, format, teams_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, short = EXCLUDED.short, scope = EXCLUDED.scope, league_id = EXCLUDED.league_id, format = EXCLUDED.format, teams_count = EXCLUDED.teams_count`,
          [
            leagueId,
            league.league.name,
            shortName(league.league.name),
            "domestic-league",
            leagueId,
            "league",
            20,
          ],
        );
      }

      const cupId = `${leagueId}-cup`;
      if (forceSync || !existingCompetitions.has(cupId)) {
        await query(
          `INSERT INTO competitions (id, name, short, scope, league_id, format, teams_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, short = EXCLUDED.short, scope = EXCLUDED.scope, league_id = EXCLUDED.league_id, format = EXCLUDED.format, teams_count = EXCLUDED.teams_count`,
          [cupId, `${country.name} Cup`, "CUP", "domestic-cup", leagueId, "knockout", 32],
        );
        cupCount++;
      }

      leagueCount++;
      console.log(`  ✅ League: ${league.league.name} (${country.name}) -> ID: ${leagueId}`);
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    // Prune old leagues & competitions that are no longer synced (except continental cups)
    // Only prune if we successfully got enough leagues from the API (safety guard)
    const allSyncedIds = Array.from(syncedLeagueIds);
    const minLeaguesForPrune = Math.floor(TARGET_COUNTRIES.length * 0.6); // Need at least 60% success rate
    if (leagueCount >= minLeaguesForPrune && allSyncedIds.length > 0) {
      try {
        await query(
          `DELETE FROM competitions WHERE league_id IS NOT NULL AND league_id NOT IN (${allSyncedIds.map((_, i) => `$${i + 1}`).join(", ")})`,
          allSyncedIds,
        );
        await query(
          `DELETE FROM leagues WHERE id NOT IN (${allSyncedIds.map((_, i) => `$${i + 1}`).join(", ")})`,
          allSyncedIds,
        );
        console.log("🧹 Pruned outdated/removed leagues and competitions from DB.");
      } catch (err) {
        console.warn("⚠️ Warning during pruning:", err);
      }
    } else if (leagueCount < minLeaguesForPrune) {
      console.log(`⚠️  Skipping prune — only ${leagueCount}/${TARGET_COUNTRIES.length} leagues synced (API may be rate-limited).`);
    }

    for (const competition of CONTINENTAL_COMPETITIONS) {
      if (forceSync || !existingCompetitions.has(competition.id)) {
        await query(
          `INSERT INTO competitions (id, name, short, scope, league_id, format, teams_count, region)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, short = EXCLUDED.short, scope = EXCLUDED.scope, format = EXCLUDED.format, teams_count = EXCLUDED.teams_count, region = EXCLUDED.region`,
          [
            competition.id,
            competition.name,
            competition.short,
            "continental",
            null,
            "league",
            32,
            "Europe",
          ],
        );
      }
    }

    console.log(`✅ Synced ${leagueCount} leagues and ${cupCount} cups.`);
    if (skippedCountries > 0) {
      console.log(`⏭️  Skipped ${skippedCountries} countries that RapidAPI could not map.`);
    }
  } catch (error) {
    console.error("❌ Error syncing leagues:", error);
  }
}

async function syncClubs(forceSync = false) {
  console.log("🔄 Syncing clubs for all synced leagues...");

  let existingClubs = new Set<string>();
  if (!forceSync) {
    const { rows } = await query("SELECT id FROM clubs");
    existingClubs = new Set(rows.map((row) => row.id));
    console.log(`📋 Found ${existingClubs.size} existing clubs in DB`);
  }

  try {
    // Delete non-simulator clubs if force syncing.
    // Simulator clubs are in CLUBS from ./data/clubs.ts.
    const simulatorClubIds = CLUBS.map((c) => c.id);
    if (forceSync) {
      console.log("🗑️  Force sync: deleting all non-simulator clubs...");
      await query(
        `DELETE FROM clubs WHERE id NOT IN (${simulatorClubIds.map((_, i) => `$${i + 1}`).join(", ")})`,
        simulatorClubIds
      );
    }

    // Step 1: Ensure leagues and competitions structure for simulator data is updated
    for (const league of LEAGUES) {
      await query(
        `INSERT INTO leagues (id, name, country, short, country_code)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, country = EXCLUDED.country, short = EXCLUDED.short, country_code = EXCLUDED.country_code`,
        [league.id, league.name, league.country, league.short, league.countryCode],
      );

      const clubsInLeague = CLUBS.filter((club) => club.league === league.id);
      await query(
        `INSERT INTO competitions (id, name, short, scope, league_id, format, teams_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, short = EXCLUDED.short, scope = EXCLUDED.scope, league_id = EXCLUDED.league_id, format = EXCLUDED.format, teams_count = EXCLUDED.teams_count`,
        [
          league.id,
          league.name,
          league.short,
          "domestic-league",
          league.id,
          "league",
          clubsInLeague.length,
        ],
      );

      await query(
        `INSERT INTO competitions (id, name, short, scope, league_id, format, teams_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, short = EXCLUDED.short, scope = EXCLUDED.scope, league_id = EXCLUDED.league_id, format = EXCLUDED.format, teams_count = EXCLUDED.teams_count`,
        [
          `${league.id}-cup`,
          `${league.name} Cup`,
          "CUP",
          "domestic-cup",
          league.id,
          "knockout",
          32,
        ],
      );
    }

    // Step 2: Fetch all leagues that currently exist in the database
    const { rows: dbLeagues } = await query<{ id: string; name: string; country: string }>(
      "SELECT id, name, country FROM leagues"
    );

    // Get counts of clubs currently in the DB for each league to determine if we can skip them
    const { rows: counts } = await query<{ league_id: string; count: number }>(
      "SELECT league_id, COUNT(*)::int as count FROM clubs GROUP BY league_id"
    );
    const clubsCountByLeague = new Map(counts.map((r) => [r.league_id, r.count]));

    let totalClubs = 0;
    let skippedLeagues = 0;
    const TIER_REPUTATIONS: Record<number, number> = { 1: 68, 2: 60, 3: 55, 4: 48 };

    for (const league of dbLeagues) {
      console.log(`Checking teams for league ${league.id} (${league.name} - ${league.country})...`);

      const isSimulatorLeague = LEAGUES.some((l) => l.id === league.id);
      const existingCount = clubsCountByLeague.get(league.id) ?? 0;

      // Skip criteria: if not forceSync, and we have enough clubs synced for this league
      // Simulator leagues have 15+ clubs, other API leagues have 10+ clubs
      if (!forceSync && existingCount >= (isSimulatorLeague ? 15 : 10)) {
        console.log(`  ⏭️  ${league.country} already synced with ${existingCount} clubs, skipping...`);
        skippedLeagues++;
        totalClubs += existingCount;
        continue;
      }

      // Find API League ID - check simulator LEAGUE_IDS first, then API_ONLY_LEAGUE_IDS, then fallback to numeric parse
      const apiLeagueId = isNaN(Number(league.id))
        ? LEAGUE_IDS[league.id as keyof typeof LEAGUE_IDS]
        : (API_ONLY_LEAGUE_IDS[league.id] ?? Number(league.id));

      let apiTeams: any[] = [];
      if (apiLeagueId) {
        try {
          console.log(`  📡 Fetching clubs from API for league ID ${apiLeagueId}...`);
          apiTeams = await footballApi.getTeamsById(apiLeagueId);
          console.log(`  📊 Found ${apiTeams.length} clubs from API`);
        } catch (err) {
          console.error(`  ❌ Failed to fetch clubs for league ${league.name} from API:`, err);
        }
      }

      // If API teams fetch returned nothing (due to rate limits or API issue), fall back to our high-quality static fallback data!
      if (apiTeams.length === 0) {
        const fallbacks = FALLBACK_CLUBS[league.id];
        if (fallbacks) {
          console.log(`  💡 Falling back to ${fallbacks.length} pre-defined clubs for ${league.name}...`);
          apiTeams = fallbacks.map((fb, index) => ({
            team: {
              id: 900000 + Math.abs(normalize(fb.name).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) + index, // Deterministic ID
              name: fb.name,
              code: fb.short,
              country: league.country,
              logo: null,
            },
            venue: {
              city: fb.city,
            },
          }));
        }
      }

      const clubsForLeague = CLUBS.filter((club) => club.league === league.id);
      const syncedClubIds = new Set<string>();
      let syncedCount = 0;

      // Match and insert/update clubs from the API
      for (const team of apiTeams) {
        const normName = normalize(team.team.name);
        const simulatorClub = clubsForLeague.find(
          (c) => normalize(c.name) === normName || normalize(c.short) === normalize(team.team.code)
        );

        let clubId: string;
        let clubName: string;
        let clubShort: string;
        let city: string;
        let tier: number;
        let reputation: number;
        let primaryColor: string;
        let secondaryColor: string;

        if (simulatorClub) {
          clubId = simulatorClub.id;
          clubName = simulatorClub.name;
          clubShort = simulatorClub.short;
          city = simulatorClub.city;
          tier = simulatorClub.tier;
          reputation = simulatorClub.reputation;
          primaryColor = simulatorClub.colors[0];
          secondaryColor = simulatorClub.colors[1];
          syncedClubIds.add(simulatorClub.id);
        } else {
          clubId = `api-club-${team.team.id}`;
          clubName = team.team.name;
          clubShort = team.team.code;
          city = team.venue.city || league.country;
          tier = calculateTier(league.country);
          reputation = TIER_REPUTATIONS[tier] ?? 50;
          primaryColor = "#FFFFFF";
          secondaryColor = "#000000";
        }

        await query(
          `INSERT INTO clubs (id, name, short, league_id, city, tier, reputation, color_primary, color_secondary, logo_url, api_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             short = EXCLUDED.short,
             league_id = EXCLUDED.league_id,
             city = EXCLUDED.city,
             tier = EXCLUDED.tier,
             reputation = EXCLUDED.reputation,
             color_primary = EXCLUDED.color_primary,
             color_secondary = EXCLUDED.color_secondary,
             logo_url = EXCLUDED.logo_url,
             api_id = EXCLUDED.api_id`,
          [
            clubId,
            clubName,
            clubShort,
            league.id,
            city,
            tier,
            reputation,
            primaryColor,
            secondaryColor,
            team.team.logo || null,
            team.team.id,
          ],
        );
        syncedCount++;
        totalClubs++;
      }

      // Insert any remaining simulator clubs that weren't matched in the API response
      for (const club of clubsForLeague) {
        if (!syncedClubIds.has(club.id)) {
          await query(
            `INSERT INTO clubs (id, name, short, league_id, city, tier, reputation, color_primary, color_secondary, logo_url, api_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               short = EXCLUDED.short,
               league_id = EXCLUDED.league_id,
               city = EXCLUDED.city,
               tier = EXCLUDED.tier,
               reputation = EXCLUDED.reputation,
               color_primary = EXCLUDED.color_primary,
               color_secondary = EXCLUDED.color_secondary`,
            [
              club.id,
              club.name,
              club.short,
              league.id,
              club.city,
              club.tier,
              club.reputation,
              club.colors[0],
              club.colors[1],
              null,
              null,
            ],
          );
          syncedCount++;
          totalClubs++;
        }
      }

      console.log(`  ✅ ${league.country}: ${syncedCount} clubs synced`);
      // Add a small delay between leagues to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    console.log(`✅ Synced ${totalClubs} clubs.`);
    if (skippedLeagues > 0) {
      console.log(`⏭️  Skipped ${skippedLeagues} already synced leagues.`);
    }
  } catch (error) {
    console.error("❌ Error syncing clubs:", error);
  }
}

async function syncAwards(forceSync = false) {
  console.log("🔄 Syncing local awards...");

  let existingAwards = new Set<string>();
  if (!forceSync) {
    const { rows } = await query("SELECT id FROM awards");
    existingAwards = new Set(rows.map((row) => row.id));
    console.log(`📋 Found ${existingAwards.size} existing awards in DB`);
  }

  const awardsToSync = AWARDS.filter((award) => forceSync || !existingAwards.has(award.id));
  if (awardsToSync.length === 0) {
    console.log(`✅ All ${AWARDS.length} awards already synced!`);
    return;
  }

  console.log(`🔄 Need to sync: ${awardsToSync.length}/${AWARDS.length} awards`);

  let count = 0;
  for (const award of awardsToSync) {
    await query(
      `INSERT INTO awards (id, name, scope, icon)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, scope = EXCLUDED.scope, icon = EXCLUDED.icon`,
      [award.id, award.name, award.scope, award.icon],
    );
    count++;
    console.log(`  ✅ Award: ${award.name} (${award.scope})`);
  }

  console.log(`✅ Synced ${count} awards.`);
}

async function main() {
  const args = process.argv.slice(2);
  const typeFlag = args.find((arg) => arg.startsWith("--type="));
  const forceFlag = args.includes("--force");

  const type = typeFlag ? typeFlag.split("=")[1] : null;
  const forceSync = !!forceFlag;

  if (!type) {
    console.error("Please specify what to sync: --type=countries | leagues | clubs | awards");
    console.error("Options:");
    console.error("  --force    Sync all items regardless of existing data");
    process.exit(1);
  }

  console.log(`🚀 Starting ${type} sync...`);
  console.log(`🔄 Force mode: ${forceSync ? "ON (sync all)" : "OFF (skip existing)"}`);
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
      process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal sync error:", error);
  process.exit(1);
});
