// Script to update existing club IDs in database to match frontend IDs
import { query } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

// Mapping from normalized API team names to frontend club IDs
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

function normalizeTeamName(teamName: string): string {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  console.log("🔄 Updating club IDs to match frontend...\n");

  try {
    // Clear players table to avoid foreign key constraint issues
    await query("DELETE FROM players");
    console.log("Cleared players table\n");

    const { rows: clubs } = await query("SELECT id, name FROM clubs");
    console.log(`Found ${clubs.length} clubs in database\n`);

    let updated = 0;
    let skipped = 0;

    for (const club of clubs) {
      const normalizedName = normalizeTeamName(club.name);
      const newId = TEAM_ID_MAPPING[normalizedName];

      if (newId && newId !== club.id) {
        // Delete existing record with new ID if it exists
        await query("DELETE FROM clubs WHERE id = $1", [newId]);

        // Update the ID
        await query(
          "UPDATE clubs SET id = $1 WHERE id = $2",
          [newId, club.id]
        );
        console.log(`✅ Updated: ${club.name} (${club.id} → ${newId})`);
        updated++;
      } else if (!newId) {
        console.log(`⚠️ No mapping for: ${club.name} (${club.id})`);
        skipped++;
      }
    }

    console.log(`\n✅ Update complete!`);
    console.log(`📊 Updated: ${updated} clubs`);
    console.log(`📊 Skipped: ${skipped} clubs`);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
