import type { LeagueId } from "./clubs";

export type CompetitionFormat = "league" | "knockout" | "group_knockout";

export type Competition = {
  id: string;
  name: string;
  short: string;
  scope: "domestic-league" | "domestic-cup" | "domestic-league-cup" | "continental";
  format: CompetitionFormat;
  league?: LeagueId;
  region?: "europe" | "americas" | "asia";
  tierBoost: number;
  teamsCount: number;
  // for knockout / group_knockout: sequence of stages
  rounds?: string[];
};

// stages helpers
const KO32 = ["R32", "R16", "QF", "SF", "F"];
const KO16 = ["R16", "QF", "SF", "F"];
const KO8 = ["QF", "SF", "F"];
const UCL_STAGES = ["GS", "R16", "QF", "SF", "F"];

export const COMPETITIONS: Competition[] = [
  // Domestic leagues
  { id: "epl", name: "Premier League", short: "EPL", scope: "domestic-league", format: "league", league: "epl", tierBoost: 0, teamsCount: 20 },
  { id: "laliga", name: "La Liga", short: "LAL", scope: "domestic-league", format: "league", league: "laliga", tierBoost: 0, teamsCount: 20 },
  { id: "seriea", name: "Serie A", short: "SA", scope: "domestic-league", format: "league", league: "seriea", tierBoost: 0, teamsCount: 20 },
  { id: "bundesliga", name: "Bundesliga", short: "BUN", scope: "domestic-league", format: "league", league: "bundesliga", tierBoost: 0, teamsCount: 18 },
  { id: "ligue1", name: "Ligue 1", short: "L1", scope: "domestic-league", format: "league", league: "ligue1", tierBoost: 0, teamsCount: 18 },
  { id: "eredivisie", name: "Eredivisie", short: "ERE", scope: "domestic-league", format: "league", league: "eredivisie", tierBoost: 0, teamsCount: 18 },
  { id: "liga-pt", name: "Liga Portugal", short: "PRI", scope: "domestic-league", format: "league", league: "liga-pt", tierBoost: 0, teamsCount: 18 },
  { id: "super-lig", name: "Süper Lig", short: "SL", scope: "domestic-league", format: "league", league: "super-lig", tierBoost: 0, teamsCount: 20 },
  { id: "mls", name: "MLS", short: "MLS", scope: "domestic-league", format: "league", league: "mls", tierBoost: 0, teamsCount: 29 },
  { id: "saudi", name: "Saudi Pro League", short: "SPL", scope: "domestic-league", format: "league", league: "saudi", tierBoost: 0, teamsCount: 18 },

  // Domestic cups (main)
  { id: "fa-cup", name: "FA Cup", short: "FA", scope: "domestic-cup", format: "knockout", league: "epl", tierBoost: -0.1, teamsCount: 32, rounds: KO32 },
  { id: "efl-cup", name: "EFL Cup", short: "EFL", scope: "domestic-league-cup", format: "knockout", league: "epl", tierBoost: -0.15, teamsCount: 16, rounds: KO16 },
  { id: "copa-del-rey", name: "Copa del Rey", short: "CDR", scope: "domestic-cup", format: "knockout", league: "laliga", tierBoost: -0.1, teamsCount: 32, rounds: KO32 },
  { id: "coppa-italia", name: "Coppa Italia", short: "CIT", scope: "domestic-cup", format: "knockout", league: "seriea", tierBoost: -0.1, teamsCount: 32, rounds: KO32 },
  { id: "dfb-pokal", name: "DFB-Pokal", short: "DFB", scope: "domestic-cup", format: "knockout", league: "bundesliga", tierBoost: -0.1, teamsCount: 32, rounds: KO32 },
  { id: "coupe-de-france", name: "Coupe de France", short: "CDF", scope: "domestic-cup", format: "knockout", league: "ligue1", tierBoost: -0.1, teamsCount: 32, rounds: KO32 },
  { id: "knvb-cup", name: "KNVB Beker", short: "KNVB", scope: "domestic-cup", format: "knockout", league: "eredivisie", tierBoost: -0.1, teamsCount: 16, rounds: KO16 },
  { id: "taca-pt", name: "Taça de Portugal", short: "TCA", scope: "domestic-cup", format: "knockout", league: "liga-pt", tierBoost: -0.1, teamsCount: 16, rounds: KO16 },
  { id: "turkish-cup", name: "Türkiye Kupası", short: "TK", scope: "domestic-cup", format: "knockout", league: "super-lig", tierBoost: -0.1, teamsCount: 16, rounds: KO16 },
  { id: "us-open-cup", name: "US Open Cup", short: "USOC", scope: "domestic-cup", format: "knockout", league: "mls", tierBoost: -0.1, teamsCount: 16, rounds: KO16 },
  { id: "kings-cup", name: "King's Cup", short: "KC", scope: "domestic-cup", format: "knockout", league: "saudi", tierBoost: -0.1, teamsCount: 16, rounds: KO16 },

  // Continental
  { id: "ucl", name: "UEFA Champions League", short: "UCL", scope: "continental", format: "group_knockout", region: "europe", tierBoost: 0.35, teamsCount: 32, rounds: UCL_STAGES },
  { id: "uel", name: "UEFA Europa League", short: "UEL", scope: "continental", format: "group_knockout", region: "europe", tierBoost: 0.15, teamsCount: 32, rounds: UCL_STAGES },
  { id: "uecl", name: "UEFA Conference League", short: "UECL", scope: "continental", format: "knockout", region: "europe", tierBoost: 0.05, teamsCount: 16, rounds: KO16 },
];

export const competitionById = (id: string) => COMPETITIONS.find((c) => c.id === id);
export const cupsForLeague = (l: LeagueId) => COMPETITIONS.filter(c => c.league === l && (c.scope === "domestic-cup" || c.scope === "domestic-league-cup"));

export type AwardId =
  | "ballon-dor" | "fifa-best" | "uefa-poty" | "golden-boy" | "toty"
  | "golden-boot" | "golden-glove" | "best-young" | "poty-league" | "tots"
  | "top-assist"
  | "potm" | "sotm" | "gotm" | "totm"
  | "ucl-top-scorer" | "ucl-poty" | "uel-poty";

export type Award = {
  id: AwardId;
  name: string;
  scope: "world" | "league" | "monthly" | "season" | "continental";
  tier: "world" | "continental" | "league-season" | "league-monthly";
  icon: string;
};

export const AWARDS: Record<AwardId, Award> = {
  // World / annual
  "ballon-dor":     { id: "ballon-dor",     name: "Ballon d'Or",              scope: "world", tier: "world", icon: "🏆" },
  "fifa-best":      { id: "fifa-best",      name: "FIFA The Best",            scope: "world", tier: "world", icon: "🥇" },
  "uefa-poty":      { id: "uefa-poty",      name: "UEFA Men's Player of the Year", scope: "world", tier: "world", icon: "⭐" },
  "golden-boy":     { id: "golden-boy",     name: "Golden Boy (U-21)",        scope: "world", tier: "world", icon: "🌟" },
  "toty":           { id: "toty",           name: "FIFPRO Team of the Year",  scope: "world", tier: "world", icon: "🧢" },

  // Continental
  "ucl-top-scorer": { id: "ucl-top-scorer", name: "UCL Top Scorer",           scope: "continental", tier: "continental", icon: "🎯" },
  "ucl-poty":       { id: "ucl-poty",       name: "UCL Player of the Season", scope: "continental", tier: "continental", icon: "🌍" },
  "uel-poty":       { id: "uel-poty",       name: "UEL Player of the Season", scope: "continental", tier: "continental", icon: "🌐" },

  // Domestic league — seasonal
  "golden-boot":    { id: "golden-boot",    name: "Golden Boot",              scope: "league", tier: "league-season", icon: "👟" },
  "top-assist":     { id: "top-assist",     name: "Playmaker (Top Assist)",   scope: "league", tier: "league-season", icon: "🎁" },
  "golden-glove":   { id: "golden-glove",   name: "Golden Glove",             scope: "league", tier: "league-season", icon: "🧤" },
  "best-young":     { id: "best-young",     name: "Best Young Player",        scope: "league", tier: "league-season", icon: "🚀" },
  "poty-league":    { id: "poty-league",    name: "League Player of the Year", scope: "league", tier: "league-season", icon: "🎖️" },
  "tots":           { id: "tots",           name: "Team of the Season",       scope: "season", tier: "league-season", icon: "🏅" },

  // Domestic league — monthly
  "potm":           { id: "potm",           name: "Player of the Month",      scope: "monthly", tier: "league-monthly", icon: "📅" },
  "sotm":           { id: "sotm",           name: "Save of the Month",        scope: "monthly", tier: "league-monthly", icon: "🧤" },
  "gotm":           { id: "gotm",           name: "Goal of the Month",        scope: "monthly", tier: "league-monthly", icon: "⚽" },
  "totm":           { id: "totm",           name: "Team of the Month",        scope: "monthly", tier: "league-monthly", icon: "🧩" },
};
