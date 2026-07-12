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
      color_secondary VARCHAR(16) NOT NULL,
      logo_url TEXT
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

    ALTER TABLE competitions ADD COLUMN IF NOT EXISTS format VARCHAR(24) NOT NULL DEFAULT 'league';
    ALTER TABLE competitions ADD COLUMN IF NOT EXISTS teams_count SMALLINT NOT NULL DEFAULT 20;
    ALTER TABLE competitions ADD COLUMN IF NOT EXISTS rounds JSONB;

    -- Add logo_url column to clubs table if it doesn't exist
    ALTER TABLE clubs ADD COLUMN IF NOT EXISTS logo_url TEXT;

    -- Add api_id column to clubs to store numeric ID from API-Football
    ALTER TABLE clubs ADD COLUMN IF NOT EXISTS api_id INT;
    CREATE INDEX IF NOT EXISTS idx_clubs_api_id ON clubs(api_id);

    -- Players table for real football data
    CREATE TABLE IF NOT EXISTS players (
      id VARCHAR(64) PRIMARY KEY,
      name TEXT NOT NULL,
      firstname TEXT,
      lastname TEXT,
      age SMALLINT,
      nationality TEXT,
      position VARCHAR(8),
      club_id VARCHAR(64) REFERENCES clubs(id),
      photo_url TEXT,
      height VARCHAR(16),
      weight VARCHAR(16)
    );

    -- Fix nationality column type if it was previously VARCHAR(4)
    ALTER TABLE players ALTER COLUMN nationality TYPE TEXT;
    -- Fix height/weight column type if they were previously VARCHAR(8)
    ALTER TABLE players ALTER COLUMN height TYPE TEXT;
    ALTER TABLE players ALTER COLUMN weight TYPE TEXT;

    -- Player statistics table
    CREATE TABLE IF NOT EXISTS player_stats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id VARCHAR(64) NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      season INT NOT NULL,
      league_id VARCHAR(32) NOT NULL,
      appearances INT DEFAULT 0,
      goals INT DEFAULT 0,
      assists INT DEFAULT 0,
      minutes INT DEFAULT 0,
      rating REAL DEFAULT 0,
      yellow_cards INT DEFAULT 0,
      red_cards INT DEFAULT 0,
      UNIQUE (player_id, season, league_id)
    );

    CREATE INDEX IF NOT EXISTS idx_players_club ON players(club_id);
    CREATE INDEX IF NOT EXISTS idx_player_stats_season ON player_stats(season, league_id);

    CREATE TABLE IF NOT EXISTS season_competitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      save_id VARCHAR(64) NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
      season_idx INT NOT NULL,
      competition_id VARCHAR(64) NOT NULL REFERENCES competitions(id),
      qualified BOOLEAN NOT NULL DEFAULT TRUE,
      current_stage TEXT,
      eliminated_at TEXT,
      final_position INT,
      UNIQUE (save_id, season_idx, competition_id)
    );
    CREATE INDEX IF NOT EXISTS idx_season_comp_save ON season_competitions(save_id, season_idx);

    CREATE TABLE IF NOT EXISTS matches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      save_id VARCHAR(64) NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
      season_idx INT NOT NULL,
      competition_id VARCHAR(64) NOT NULL REFERENCES competitions(id),
      matchday INT,
      stage TEXT,
      leg SMALLINT,
      order_key INT NOT NULL,
      opponent_club_id VARCHAR(64) NOT NULL REFERENCES clubs(id),
      home BOOLEAN NOT NULL,
      played BOOLEAN NOT NULL DEFAULT FALSE,
      team_goals INT,
      opp_goals INT,
      player_selection VARCHAR(16),
      player_minutes INT,
      player_goals INT,
      player_assists INT,
      player_saves INT,
      player_rating REAL,
      yellow BOOLEAN,
      red BOOLEAN,
      clean_sheet BOOLEAN,
      motm BOOLEAN,
      injury_matches INT,
      played_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_matches_save_season ON matches(save_id, season_idx, order_key);
    CREATE INDEX IF NOT EXISTS idx_matches_played ON matches(save_id, played);

    CREATE TABLE IF NOT EXISTS trophies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      save_id VARCHAR(64) NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
      season_idx INT NOT NULL,
      competition_id VARCHAR(64) NOT NULL REFERENCES competitions(id),
      club_id VARCHAR(64) NOT NULL REFERENCES clubs(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_trophies_save ON trophies(save_id, season_idx);

    CREATE TABLE IF NOT EXISTS awards_won (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      save_id VARCHAR(64) NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
      season_idx INT NOT NULL,
      award_id VARCHAR(64) NOT NULL REFERENCES awards(id),
      club_id VARCHAR(64) REFERENCES clubs(id),
      detail TEXT,
      rank_position INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_awards_won_save ON awards_won(save_id, season_idx);

    CREATE TABLE IF NOT EXISTS award_nominees (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      save_id VARCHAR(64) NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
      season_idx INT NOT NULL,
      award_id VARCHAR(64) NOT NULL REFERENCES awards(id),
      rank_position INT NOT NULL,
      player_name TEXT NOT NULL,
      club_id VARCHAR(64) REFERENCES clubs(id),
      is_you BOOLEAN NOT NULL DEFAULT FALSE,
      stats JSONB
    );
    CREATE INDEX IF NOT EXISTS idx_award_nominees_save ON award_nominees(save_id, season_idx, award_id);

    CREATE TABLE IF NOT EXISTS transfers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      save_id VARCHAR(64) NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
      season_idx INT NOT NULL,
      from_club_id VARCHAR(64) REFERENCES clubs(id),
      to_club_id VARCHAR(64) NOT NULL REFERENCES clubs(id),
      fee_m REAL NOT NULL DEFAULT 0,
      wage_k INT NOT NULL,
      years SMALLINT NOT NULL,
      kind VARCHAR(24) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_transfers_save ON transfers(save_id);

    CREATE TABLE IF NOT EXISTS news (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      save_id VARCHAR(64) NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
      season_idx INT NOT NULL,
      matchday INT,
      tag VARCHAR(24) NOT NULL,
      headline TEXT NOT NULL,
      body TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_news_save ON news(save_id, season_idx);

    CREATE TABLE IF NOT EXISTS social_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      save_id VARCHAR(64) NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
      season_idx INT NOT NULL,
      matchday INT,
      body TEXT NOT NULL,
      likes INT NOT NULL DEFAULT 0,
      comments INT NOT NULL DEFAULT 0,
      reposts INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_social_save ON social_posts(save_id, season_idx);
  `);

  console.log("Migration complete.");
}
