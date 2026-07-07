import { query, pool } from "./db.js";

export async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS countries (
      code VARCHAR(4) PRIMARY KEY,
      name TEXT NOT NULL,
      flag TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leagues (
      id VARCHAR(32) PRIMARY KEY,
      name TEXT NOT NULL,
      country TEXT NOT NULL,
      short VARCHAR(8) NOT NULL,
      country_code VARCHAR(4) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clubs (
      id VARCHAR(64) PRIMARY KEY,
      name TEXT NOT NULL,
      short VARCHAR(8) NOT NULL,
      league_id VARCHAR(32) NOT NULL REFERENCES leagues(id),
      city TEXT NOT NULL,
      tier SMALLINT NOT NULL,
      reputation SMALLINT NOT NULL,
      color_primary VARCHAR(16) NOT NULL,
      color_secondary VARCHAR(16) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS competitions (
      id VARCHAR(64) PRIMARY KEY,
      name TEXT NOT NULL,
      short VARCHAR(8) NOT NULL,
      scope VARCHAR(32) NOT NULL,
      league_id VARCHAR(32),
      region VARCHAR(32),
      tier_boost REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS awards (
      id VARCHAR(64) PRIMARY KEY,
      name TEXT NOT NULL,
      scope VARCHAR(32) NOT NULL,
      icon TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Drop existing sessions table if it exists without user_id
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'id') 
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'user_id') THEN
        DROP TABLE sessions CASCADE;
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      active_save_id VARCHAR(64),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
      action VARCHAR(50) NOT NULL,
      details JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS saves (
      id VARCHAR(64) PRIMARY KEY,
      session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_saves_session ON saves(session_id);
    CREATE INDEX IF NOT EXISTS idx_saves_updated ON saves(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_session ON activity_logs(session_id);
  `);

  console.log("Migration complete.");
}
