import { type Save } from "./types";
import { clubById, clubsByLeague } from "../store";
import { mulberry32, range } from "./rng";

export type StandingRow = {
  clubId: string;
  name: string;
  played: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
};

export function generateLeagueStandings(save: Save): StandingRow[] {
  const playerClub = clubById(save.currentClub.clubId);
  if (!playerClub) return [];
  
  const leagueClubs = clubsByLeague(playerClub.league);
  const matchday = save.season.matchday;
  
  const rows: StandingRow[] = [];
  
  for (const c of leagueClubs) {
    if (c.id === playerClub.id) {
      // Use actual player stats
      const cs = save.season.currentStats;
      const w = cs.teamWins || 0;
      const d = cs.teamDraws || 0;
      const l = cs.teamLosses || 0;
      const gf = cs.teamGoalsFor || 0;
      const ga = cs.teamGoalsAgainst || 0;
      
      rows.push({
        clubId: c.id,
        name: c.name,
        played: w + d + l,
        w, d, l, gf, ga,
        gd: gf - ga,
        pts: w * 3 + d
      });
      continue;
    }
    
    // Deterministic simulation for other clubs up to `matchday`
    const str = save.id + save.season.index + c.id;
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
    const rng = mulberry32(hash);
    
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    // Reputation dibandingkan ke rata-rata reputation liga (bukan skala absolut /100),
    // biar konsisten dgn cara match-sim.ts menghitung strengthDiff antar klub.
    const leagueAvgRep = leagueClubs.reduce((s, x) => s + x.reputation, 0) / leagueClubs.length;
    const strengthDiff = (c.reputation - leagueAvgRep) / 100;
    const winProb = Math.max(0.1, Math.min(0.75, 0.4 + strengthDiff * 0.9));
    const drawProb = Math.max(0.16, 0.27 - Math.abs(strengthDiff) * 0.3);
    
    for (let m = 0; m < matchday; m++) {
      const roll = rng();
      if (roll < winProb) {
        w++;
        gf += range(1, 3, rng);
        ga += range(0, 1, rng);
      } else if (roll < winProb + drawProb) {
        d++;
        const goals = range(0, 2, rng);
        gf += goals;
        ga += goals;
      } else {
        l++;
        gf += range(0, 1, rng);
        ga += range(1, 3, rng);
      }
    }
    
    rows.push({
      clubId: c.id,
      name: c.name,
      played: matchday,
      w, d, l, gf, ga,
      gd: gf - ga,
      pts: w * 3 + d
    });
  }
  
  // Sort by PTS, then GD, then GF
  rows.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
  
  return rows;
}