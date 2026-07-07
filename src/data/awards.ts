import type { LeagueId } from "./clubs";

export type Competition = {
  id: string;
  name: string;
  short: string;
  scope: "domestic-league" | "domestic-cup" | "continental";
  league?: LeagueId;
  region?: "europe" | "americas" | "asia";
  tierBoost: number; // higher = harder to win
};

export const COMPETITIONS: Competition[] = [
  { id: "epl", name: "Premier League", short: "EPL", scope: "domestic-league", league: "epl", tierBoost: 0 },
  { id: "laliga", name: "La Liga", short: "LAL", scope: "domestic-league", league: "laliga", tierBoost: 0 },
  { id: "seriea", name: "Serie A", short: "SA", scope: "domestic-league", league: "seriea", tierBoost: 0 },
  { id: "bundesliga", name: "Bundesliga", short: "BUN", scope: "domestic-league", league: "bundesliga", tierBoost: 0 },
  { id: "ligue1", name: "Ligue 1", short: "L1", scope: "domestic-league", league: "ligue1", tierBoost: 0 },
  { id: "eredivisie", name: "Eredivisie", short: "ERE", scope: "domestic-league", league: "eredivisie", tierBoost: 0 },
  { id: "liga-pt", name: "Liga Portugal", short: "PRI", scope: "domestic-league", league: "liga-pt", tierBoost: 0 },
  { id: "super-lig", name: "Süper Lig", short: "SL", scope: "domestic-league", league: "super-lig", tierBoost: 0 },
  { id: "mls", name: "MLS Cup", short: "MLS", scope: "domestic-league", league: "mls", tierBoost: 0 },
  { id: "saudi", name: "Saudi Pro League", short: "SPL", scope: "domestic-league", league: "saudi", tierBoost: 0 },

  { id: "fa-cup", name: "FA Cup", short: "FA", scope: "domestic-cup", league: "epl", tierBoost: -0.1 },
  { id: "efl-cup", name: "EFL Cup", short: "EFL", scope: "domestic-cup", league: "epl", tierBoost: -0.15 },
  { id: "copa-del-rey", name: "Copa del Rey", short: "CDR", scope: "domestic-cup", league: "laliga", tierBoost: -0.1 },
  { id: "coppa-italia", name: "Coppa Italia", short: "CIT", scope: "domestic-cup", league: "seriea", tierBoost: -0.1 },
  { id: "dfb-pokal", name: "DFB-Pokal", short: "DFB", scope: "domestic-cup", league: "bundesliga", tierBoost: -0.1 },
  { id: "coupe-de-france", name: "Coupe de France", short: "CDF", scope: "domestic-cup", league: "ligue1", tierBoost: -0.1 },

  { id: "ucl", name: "UEFA Champions League", short: "UCL", scope: "continental", region: "europe", tierBoost: 0.35 },
  { id: "uel", name: "UEFA Europa League", short: "UEL", scope: "continental", region: "europe", tierBoost: 0.15 },
  { id: "uecl", name: "UEFA Conference League", short: "UECL", scope: "continental", region: "europe", tierBoost: 0.05 },
];

export const competitionById = (id: string) => COMPETITIONS.find((c) => c.id === id);

export type AwardId =
  | "ballon-dor" | "fifa-best" | "uefa-poty"
  | "golden-boot" | "golden-glove" | "best-young"
  | "potm" | "poty-league" | "totm" | "tots" | "ucl-top-scorer";

export type Award = {
  id: AwardId;
  name: string;
  scope: "world" | "league" | "monthly" | "season";
  icon: string;
};

export const AWARDS: Record<AwardId, Award> = {
  "ballon-dor": { id: "ballon-dor", name: "Ballon d'Or", scope: "world", icon: "🏆" },
  "fifa-best": { id: "fifa-best", name: "FIFA Best Men's Player", scope: "world", icon: "🥇" },
  "uefa-poty": { id: "uefa-poty", name: "UEFA Player of the Year", scope: "world", icon: "⭐" },
  "golden-boot": { id: "golden-boot", name: "Golden Boot", scope: "league", icon: "👟" },
  "golden-glove": { id: "golden-glove", name: "Golden Glove", scope: "league", icon: "🧤" },
  "best-young": { id: "best-young", name: "Best Young Player", scope: "world", icon: "🌟" },
  "potm": { id: "potm", name: "Player of the Month", scope: "monthly", icon: "📅" },
  "poty-league": { id: "poty-league", name: "League Player of the Year", scope: "league", icon: "🎖️" },
  "totm": { id: "totm", name: "Team of the Month", scope: "monthly", icon: "🧩" },
  "tots": { id: "tots", name: "Team of the Season", scope: "season", icon: "🏅" },
  "ucl-top-scorer": { id: "ucl-top-scorer", name: "UCL Top Scorer", scope: "world", icon: "🎯" },
};
