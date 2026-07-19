import { query } from "../db.js";

export interface Session {
  id: string;
  user_id: string | null;
  active_save_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export class SessionModel {
  static async findById(id: string): Promise<Session | null> {
    const result = await query("SELECT * FROM sessions WHERE id = $1", [id]);
    return result.rows[0] as Session || null;
  }

  static async findByUserId(userId: string): Promise<Session[]> {
    const result = await query("SELECT * FROM sessions WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
    return result.rows as Session[];
  }

  static async create(userId: string | null): Promise<Session> {
    const result = await query(
      "INSERT INTO sessions (user_id) VALUES ($1) RETURNING *",
      [userId]
    );
    return result.rows[0] as Session;
  }

  static async updateActiveSave(id: string, activeSaveId: string | null): Promise<Session | null> {
    const result = await query(
      "UPDATE sessions SET active_save_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [activeSaveId, id]
    );
    return result.rows[0] as Session || null;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await query("DELETE FROM sessions WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }

  static async deleteByUserId(userId: string): Promise<boolean> {
    const result = await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
    return (result.rowCount ?? 0) > 0;
  }
}
