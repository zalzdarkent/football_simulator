import { Request, Response, NextFunction } from "express";
import { SessionModel } from "../models/Session.js";

export interface AuthRequest extends Request {
  session?: {
    id: string;
    userId: string | null;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const sessionId = req.headers["x-session-id"] as string;

  if (!sessionId) {
    return res.status(401).json({ error: "Session ID required" });
  }

  const session = await SessionModel.findById(sessionId);

  if (!session) {
    return res.status(401).json({ error: "Invalid session" });
  }

  req.session = {
    id: session.id,
    userId: session.user_id,
  };

  next();
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}
