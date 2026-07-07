import { seed } from "./seed.js";
import { pool } from "./db.js";

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
