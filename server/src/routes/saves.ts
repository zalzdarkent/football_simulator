import { Router } from "express";
import { query } from "../db.js";

export const savesRouter = Router();

savesRouter.get("/session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  
  // First, get the user_id from the session
  const sessionResult = await query<{ user_id: string | null }>(
    "SELECT user_id FROM sessions WHERE id = $1",
    [sessionId]
  );
  
  if (!sessionResult.rows[0]) {
    return res.status(404).json({ error: "Session not found" });
  }
  
  const userId = sessionResult.rows[0].user_id;
  
  let rows: { id: string; data: unknown; created_at: string; updated_at: string }[];
  if (userId) {
    // If user is logged in, get all saves from all sessions of this user
    const result = await query<{ id: string; data: unknown; created_at: string; updated_at: string }>(
      `SELECT s.id, s.data, s.created_at, s.updated_at 
       FROM saves s
       JOIN sessions sess ON s.session_id = sess.id
       WHERE sess.user_id = $1
       ORDER BY s.updated_at DESC`,
      [userId]
    );
    rows = result.rows;
  } else {
    // Anonymous session, only get saves from this session
    const result = await query<{ id: string; data: unknown; created_at: string; updated_at: string }>(
      "SELECT id, data, created_at, updated_at FROM saves WHERE session_id = $1 ORDER BY updated_at DESC",
      [sessionId]
    );
    rows = result.rows;
  }
  
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
