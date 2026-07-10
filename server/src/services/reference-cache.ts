// Reference cache loaded from Postgres once per process.
import { query } from "../db.js";

export type ClubRow = {
  id: string; name: string; short: string; league_id: string;
  city: string; tier: number; reputation: number;
  color_primary: string; color_secondary: string;
};
export type CompRow = {
  id: string; name: string; short: string; scope: string;
  league_id: string | null; region: string | null; tier_boost: number;
  format: "league" | "knockout" | "group_knockout";
  teams_count: number; rounds: string[] | null;
};

let clubs: ClubRow[] | null = null;
let comps: CompRow[] | null = null;

export async function getClubs(): Promise<ClubRow[]> {
  if (!clubs) {
    const { rows } = await query<ClubRow>("SELECT * FROM clubs");
    clubs = rows;
  }
  return clubs;
}
export async function getComps(): Promise<CompRow[]> {
  if (!comps) {
    const { rows } = await query<CompRow>("SELECT * FROM competitions");
    comps = rows.map(r => ({ ...r, rounds: r.rounds as any }));
  }
  return comps;
}
export async function clubById(id: string) {
  return (await getClubs()).find(c => c.id === id);
}
export async function compById(id: string) {
  return (await getComps()).find(c => c.id === id);
}
export async function clubsByLeague(league: string) {
  return (await getClubs()).filter(c => c.league_id === league);
}
export function invalidateRefCache() { clubs = null; comps = null; }
