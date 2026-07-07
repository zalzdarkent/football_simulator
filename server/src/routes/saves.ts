import { Router } from "express";
import { query } from "../db.js";

export const savesRouter = Router();

savesRouter.get("/session/:sessionId", async (req, res) => {
  const { rows } = await query<{ id: string; data: unknown; created_at: string; updated_at: string }>(
    "SELECT id, data, created_at, updated_at FROM saves WHERE session_id = $1 ORDER BY updated_at DESC",
    [req.params.sessionId],
  );
  res.json(rows.map((r) => r.data));
});

savesRouter.get("/:id", async (req, res) => {
  const { rows } = await query<{ data: unknown }>(
    "SELECT data FROM saves WHERE id = $1",
    [req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "Save not found" });
  res.json(rows[0].data);
});

savesRouter.post("/session/:sessionId", async (req, res) => {
  const save = req.body;
  if (!save?.id) return res.status(400).json({ error: "Save must include id" });

  const sessionCheck = await query("SELECT id FROM sessions WHERE id = $1", [req.params.sessionId]);
  if (!sessionCheck.rowCount) return res.status(404).json({ error: "Session not found" });

  await query(
    `INSERT INTO saves (id, session_id, data, created_at, updated_at)
     VALUES ($1, $2, $3, to_timestamp($4 / 1000.0), to_timestamp($5 / 1000.0))
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
    [save.id, req.params.sessionId, save, save.createdAt ?? Date.now(), save.updatedAt ?? Date.now()],
  );

  res.status(201).json(save);
});

savesRouter.put("/:id", async (req, res) => {
  const save = req.body;
  if (!save?.id || save.id !== req.params.id) {
    return res.status(400).json({ error: "Save id mismatch" });
  }

  const { rowCount } = await query(
    "UPDATE saves SET data = $2, updated_at = NOW() WHERE id = $1",
    [save.id, save],
  );
  if (!rowCount) return res.status(404).json({ error: "Save not found" });
  res.json(save);
});

savesRouter.delete("/:id", async (req, res) => {
  const { rowCount } = await query("DELETE FROM saves WHERE id = $1", [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: "Save not found" });
  res.status(204).send();
});
