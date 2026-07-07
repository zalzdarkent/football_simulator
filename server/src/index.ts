import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { migrate } from "./migrate.js";
import { seed } from "./seed.js";
import { pool } from "./db.js";
import { referenceRouter } from "./routes/reference.js";
import { sessionRouter } from "./routes/session.js";
import { savesRouter } from "./routes/saves.js";
import { authRouter } from "./routes/auth.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3001);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:8080";

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  } catch {
    res.status(503).json({ ok: false, db: "disconnected" });
  }
});

app.use("/api", referenceRouter);
app.use("/api/session", sessionRouter);
app.use("/api/saves", savesRouter);
app.use("/api/auth", authRouter);

async function start() {
  await migrate();
  await seed();

  app.listen(port, () => {
    console.log(`FCS API running on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
