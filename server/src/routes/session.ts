import { Router } from "express";
import { randomUUID } from "crypto";
import { query } from "../db.js";

export const sessionRouter = Router();

sessionRouter.get("/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const { rows } = await query<{ id: string; active_save_id: string | null }>(
    "SELECT id, active_save_id FROM sessions WHERE id = $1",
    [sessionId],
  );
  if (!rows[0]) return res.status(404).json({ error: "Session not found" });
  res.json({ sessionId: rows[0].id, activeSaveId: rows[0].active_save_id });
});

sessionRouter.post("/", async (_req, res) => {
  const id = randomUUID();
  await query("INSERT INTO sessions (id) VALUES ($1)", [id]);
  res.status(201).json({ sessionId: id, activeSaveId: null });
});

sessionRouter.patch("/:sessionId/active-save", async (req, res) => {
  const { sessionId } = req.params;
  const { activeSaveId } = req.body as { activeSaveId: string | null };

  const { rowCount } = await query(
    "UPDATE sessions SET active_save_id = $2, updated_at = NOW() WHERE id = $1",
    [sessionId, activeSaveId],
  );
  if (!rowCount) return res.status(404).json({ error: "Session not found" });
  res.json({ sessionId, activeSaveId });
});
