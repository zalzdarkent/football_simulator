import { query } from "./db.js";
import { seed } from "./seed.js";

async function reseed() {
  console.log("Truncating tables...");
  await query("TRUNCATE TABLE saves, sessions, awards, competitions, clubs, leagues, countries CASCADE;");
  console.log("Reseeding data...");
  await seed();
}

reseed().catch(console.error);
