import { pool } from "./db.js";

async function clean() {
  await pool.query("TRUNCATE TABLE leagues CASCADE;");
  console.log("Database cleaned.");
  process.exit(0);
}

clean();
