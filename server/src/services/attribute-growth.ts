import { PlayerSeasonAgg } from "./awards-engine.js";
import { AwardResult } from "./awards-engine.js";

export function calcAttributeGrowth(agg: PlayerSeasonAgg, awards: AwardResult[], prevOverall: number): number {
  if (agg.apps === 0) return Math.max(0, prevOverall - 1);

  let growth = 0;

  // Rating-based growth (core)
  growth += (agg.avg_rating - 6.0) * 2;

  // Goals & assists (for non-GK)
  if (agg.position !== "GK") {
    growth += agg.goals * 0.1;
    growth += agg.assists * 0.08;
  }

  // Clean sheets for defensive positions & GK
  if (["GK", "CB", "LB", "RB", "CDM"].includes(agg.position)) {
    growth += agg.clean_sheets * 0.05;
  }

  // Man of the Match
  growth += agg.motm_count * 0.3;

  // Trophies
  if (agg.domestic_league_won) growth += 1.5;
  if (agg.ucl_won) growth += 3;
  growth += Math.min(2, (agg.trophies.length - (agg.domestic_league_won ? 1 : 0) - (agg.ucl_won ? 1 : 0)) * 0.5);

  // Personal awards won (only major ones)
  const majorAwards = ["ballon-dor", "fifa-best", "uefa-poty", "poty-league", "ucl-poty"];
  const wonMajor = awards.filter(a => a.winner_is_you && majorAwards.includes(a.award_id)).length;
  growth += wonMajor * 1;

  // Age factor: younger players grow faster
  const ageFactor = Math.max(0.2, 1 - (agg.age - 17) * 0.04);
  growth *= ageFactor;

  // Floor/ceiling
  growth = Math.max(0, Math.min(12, growth));

  return Math.round(growth);
}
