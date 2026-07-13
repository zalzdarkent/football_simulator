import { Router } from "express";
import { query } from "../db.js";

export const masterRouter = Router();

masterRouter.get("/master", async (_req, res) => {
  try {
    const { rows: countries } = await query("SELECT * FROM countries ORDER BY name");
    const { rows: leagues } = await query("SELECT * FROM leagues");
    const { rows: competitions } = await query("SELECT * FROM competitions");
    const { rows: clubs } = await query("SELECT * FROM clubs");
    const { rows: awards } = await query("SELECT * FROM awards");

    res.json({
      countries,
      leagues,
      competitions,
      clubs,
      awards,
    });
  } catch (err) {
    console.error("Failed to fetch master data:", err);
    res.status(500).json({ error: "Failed to fetch master data" });
  }
});
