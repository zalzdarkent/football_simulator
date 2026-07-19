import { query } from "../db.js";

export interface MatchHistory {
  id: string;
  session_id: string;
  season_index: number;
  matchday: number;
  home_club_id: string;
  away_club_id: string;
  home_score: number;
  away_score: number;
  player_goals: number;
  player_assists: number;
  player_rating: number | null;
  motm: boolean;
  headline: string | null;
  is_active: boolean;
  created_at: Date;
}

export class MatchHistoryModel {
  static async create(data: Omit<MatchHistory, "id" | "created_at">): Promise<MatchHistory> {
    const result = await query(
      `INSERT INTO match_history 
       (session_id, season_index, matchday, home_club_id, away_club_id, 
        home_score, away_score, player_goals, player_assists, player_rating, motm, headline, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        data.session_id,
        data.season_index,
        data.matchday,
        data.home_club_id,
        data.away_club_id,
        data.home_score,
        data.away_score,
        data.player_goals,
        data.player_assists,
        data.player_rating,
        data.motm,
        data.headline,
        data.is_active,
      ]
    );
    return result.rows[0] as MatchHistory;
  }

  static async findBySession(sessionId: string, activeOnly: boolean = true): Promise<MatchHistory[]> {
    const queryStr = activeOnly
      ? "SELECT * FROM match_history WHERE session_id = $1 AND is_active = true ORDER BY season_index DESC, matchday DESC"
      : "SELECT * FROM match_history WHERE session_id = $1 ORDER BY season_index DESC, matchday DESC";
    const result = await query(queryStr, [sessionId]);
    return result.rows as MatchHistory[];
  }

  static async findBySessionAndSeason(sessionId: string, seasonIndex: number): Promise<MatchHistory[]> {
    const result = await query(
      "SELECT * FROM match_history WHERE session_id = $1 AND season_index = $2 ORDER BY matchday ASC",
      [sessionId, seasonIndex]
    );
    return result.rows as MatchHistory[];
  }

  static async deactivateSeason(sessionId: string, seasonIndex: number): Promise<void> {
    await query(
      "UPDATE match_history SET is_active = false WHERE session_id = $1 AND season_index = $2",
      [sessionId, seasonIndex]
    );
  }

  static async deleteBySession(sessionId: string): Promise<boolean> {
    const result = await query("DELETE FROM match_history WHERE session_id = $1", [sessionId]);
    return (result.rowCount ?? 0) > 0;
  }

  static async getSeasonStats(sessionId: string, seasonIndex: number): Promise<{
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    goals: number;
    assists: number;
    avgRating: number;
  }> {
    const result = await query(
      `SELECT 
        COUNT(*) as matches,
        SUM(CASE WHEN 
          (home_club_id IN (SELECT active_save_id FROM sessions WHERE id = $1) AND home_score > away_score) OR
          (away_club_id IN (SELECT active_save_id FROM sessions WHERE id = $1) AND away_score > home_score)
          THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN home_score = away_score THEN 1 ELSE 0 END) as draws,
        SUM(CASE WHEN 
          (home_club_id IN (SELECT active_save_id FROM sessions WHERE id = $1) AND home_score < away_score) OR
          (away_club_id IN (SELECT active_save_id FROM sessions WHERE id = $1) AND away_score < home_score)
          THEN 1 ELSE 0 END) as losses,
        SUM(player_goals) as goals,
        SUM(player_assists) as assists,
        AVG(player_rating) as avg_rating
       FROM match_history 
       WHERE session_id = $1 AND season_index = $2`,
      [sessionId, seasonIndex]
    );
    const row = result.rows[0];
    return {
      matches: parseInt(row.matches),
      wins: parseInt(row.wins),
      draws: parseInt(row.draws),
      losses: parseInt(row.losses),
      goals: parseInt(row.goals),
      assists: parseInt(row.assists),
      avgRating: parseFloat(row.avg_rating) || 0,
    };
  }
}
