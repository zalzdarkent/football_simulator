import { Router } from "express";
import bcrypt from "bcrypt";
import { query } from "../db.js";

const router = Router();

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Check if user already exists
    const existingUser = await query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "Username or email already exists" });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at",
      [username, email, passwordHash]
    );

    const user = result.rows[0];

    // Create session
    const sessionResult = await query(
      "INSERT INTO sessions (user_id) VALUES ($1) RETURNING id",
      [user.id]
    );

    const session = sessionResult.rows[0];

    // Log activity
    await query(
      "INSERT INTO activity_logs (user_id, session_id, action, details) VALUES ($1, $2, $3, $4)",
      [user.id, session.id, "register", JSON.stringify({ username, email })]
    );

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at,
      },
      session: {
        id: session.id,
        userId: user.id,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // Find user
    const userResult = await query(
      "SELECT id, username, email, password_hash FROM users WHERE username = $1",
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = userResult.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if user has existing session
    const existingSessionResult = await query(
      "SELECT id, active_save_id FROM sessions WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1",
      [user.id]
    );

    let session;
    if (existingSessionResult.rows.length > 0) {
      // Reuse existing session
      session = existingSessionResult.rows[0];
      console.log("Reusing existing session:", session.id, "activeSaveId:", session.active_save_id);
      // Update session timestamp
      await query("UPDATE sessions SET updated_at = NOW() WHERE id = $1", [session.id]);
    } else {
      // Create new session
      console.log("Creating new session for user:", user.id);
      const sessionResult = await query(
        "INSERT INTO sessions (user_id) VALUES ($1) RETURNING id",
        [user.id]
      );
      session = sessionResult.rows[0];
    }

    // Log activity
    await query(
      "INSERT INTO activity_logs (user_id, session_id, action, details) VALUES ($1, $2, $3, $4)",
      [user.id, session.id, "login", JSON.stringify({ username })]
    );

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      session: {
        id: session.id,
        userId: user.id,
        activeSaveId: session.active_save_id,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Logout
router.post("/logout", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    // Log activity before deleting session
    await query(
      "INSERT INTO activity_logs (session_id, action, details) VALUES ($1, $2, $3)",
      [sessionId, "logout", JSON.stringify({ sessionId })]
    );

    // Delete session
    await query("DELETE FROM sessions WHERE id = $1", [sessionId]);

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get current session
router.get("/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await query(
      `SELECT s.id, s.user_id, s.active_save_id, s.created_at, s.updated_at,
              u.username, u.email
       FROM sessions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    const session = result.rows[0];

    res.json({
      session: {
        id: session.id,
        userId: session.user_id,
        activeSaveId: session.active_save_id,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      },
      user: session.user_id ? {
        id: session.user_id,
        username: session.username,
        email: session.email,
      } : null,
    });
  } catch (error) {
    console.error("Get session error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as authRouter };
