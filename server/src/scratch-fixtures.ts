import { query, pool } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  try {
    const { rows } = await query("SELECT COUNT(*) as count FROM fixtures");
    console.log("Fixtures count:", rows[0].count);
    
    if (Number(rows[0].count) > 0) {
      const { rows: sample } = await query("SELECT * FROM fixtures LIMIT 5");
      console.log("Sample fixtures:", sample);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

main();
