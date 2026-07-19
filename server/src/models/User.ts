import { query } from "../db.js";

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export class UserModel {
  static async findById(id: string): Promise<User | null> {
    const result = await query("SELECT * FROM users WHERE id = $1", [id]);
    return result.rows[0] as User || null;
  }

  static async findByUsername(username: string): Promise<User | null> {
    const result = await query("SELECT * FROM users WHERE username = $1", [username]);
    return result.rows[0] as User || null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    return result.rows[0] as User || null;
  }

  static async create(username: string, email: string, passwordHash: string): Promise<User> {
    const result = await query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *",
      [username, email, passwordHash]
    );
    return result.rows[0] as User;
  }

  static async update(id: string, updates: Partial<Omit<User, "id" | "created_at">>): Promise<User | null> {
    const fields = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(", ");
    const values = Object.values(updates);
    const result = await query(
      `UPDATE users SET ${fields}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] as User || null;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await query("DELETE FROM users WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
