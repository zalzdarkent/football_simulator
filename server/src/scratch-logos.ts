import { query, pool } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  try {
    const { rows } = await query(
      "SELECT id, name, logo_url FROM clubs WHERE logo_url IS NOT NULL LIMIT 10"
    );
    console.log("Clubs with logos:");
    console.log(rows);
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

main();
