import { Request, Response } from "express";
import { MatchHistoryModel } from "../models/MatchHistory.js";
import { rollMatch, previewOpponent } from "../services/matchService.js";
import { AuthRequest } from "../middleware/auth.js";

export const simulateMatch = async (req: AuthRequest, res: Response) => {
  try {
    const { save } = req.body;

    if (!save) {
      return res.status(400).json({ error: "Save data is required" });
    }

    if (!req.session?.id) {
      return res.status(401).json({ error: "Session required" });
    }

    // Simple RNG
    const rng = () => Math.random();

    // Simulate match
    const { result, news, social } = rollMatch(save, rng);

    // Save to match history
    const clubId = save.currentClub.clubId;
    const opponentClubId = result.opponentClubId;
    const homeClubId = result.home ? clubId : opponentClubId;
    const awayClubId = result.home ? opponentClubId : clubId;

    await MatchHistoryModel.create({
      session_id: req.session.id,
      season_index: save.season.index,
      matchday: save.season.matchday + 1,
      home_club_id: homeClubId,
      away_club_id: awayClubId,
      home_score: result.goalsFor,
      away_score: result.goalsAgainst,
      player_goals: result.goals,
      player_assists: result.assists,
      player_rating: result.rating,
      motm: result.motm,
      headline: news.title,
      is_active: true,
    });

    res.json({ result, news, social });
  } catch (error) {
    console.error("Match simulation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMatchHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.session?.id) {
      return res.status(401).json({ error: "Session required" });
    }

    const { seasonIndex, activeOnly } = req.query;

    let history;
    if (seasonIndex) {
      history = await MatchHistoryModel.findBySessionAndSeason(
        req.session.id,
        parseInt(seasonIndex as string)
      );
    } else {
      history = await MatchHistoryModel.findBySession(
        req.session.id,
        activeOnly !== "false"
      );
    }

    res.json({ history });
  } catch (error) {
    console.error("Get match history error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getSeasonStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.session?.id) {
      return res.status(401).json({ error: "Session required" });
    }

    const { seasonIndex } = req.params;
    const seasonIndexStr = Array.isArray(seasonIndex) ? seasonIndex[0] : seasonIndex;

    const stats = await MatchHistoryModel.getSeasonStats(
      req.session.id,
      parseInt(seasonIndexStr)
    );

    res.json({ stats });
  } catch (error) {
    console.error("Get season stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deactivateSeason = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.session?.id) {
      return res.status(401).json({ error: "Session required" });
    }

    const { seasonIndex } = req.params;
    const seasonIndexStr = Array.isArray(seasonIndex) ? seasonIndex[0] : seasonIndex;

    await MatchHistoryModel.deactivateSeason(
      req.session.id,
      parseInt(seasonIndexStr)
    );

    res.json({ message: "Season deactivated" });
  } catch (error) {
    console.error("Deactivate season error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPreviewOpponent = async (req: AuthRequest, res: Response) => {
  try {
    const { save } = req.body;

    if (!save) {
      return res.status(400).json({ error: "Save data is required" });
    }

    const rng = () => Math.random();
    const opponent = previewOpponent(save, rng);

    res.json({ opponent });
  } catch (error) {
    console.error("Get preview opponent error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
