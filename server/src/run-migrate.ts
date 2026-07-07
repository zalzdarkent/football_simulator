import { migrate } from "./migrate.js";
import { pool } from "./db.js";

migrate()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
