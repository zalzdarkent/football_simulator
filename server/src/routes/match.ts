import { Router } from "express";
import { authenticate, requireAuth } from "../middleware/auth.js";
import {
  simulateMatch,
  getMatchHistory,
  getSeasonStats,
  deactivateSeason,
  getPreviewOpponent,
} from "../controllers/matchController.js";

const router = Router();

// All match routes require authentication
router.use(authenticate);

router.post("/simulate", requireAuth, simulateMatch);
router.get("/history", requireAuth, getMatchHistory);
router.get("/stats/:seasonIndex", requireAuth, getSeasonStats);
router.post("/deactivate/:seasonIndex", requireAuth, deactivateSeason);
router.post("/preview", getPreviewOpponent);

export { router as matchRouter };
