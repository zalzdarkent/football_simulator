export type Position = "GK" | "CB" | "LB" | "RB" | "CDM" | "CM" | "CAM" | "LW" | "RW" | "ST";
export type Foot = "Left" | "Right" | "Both";

export const POSITIONS: Position[] = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];

export const POSITION_LABEL: Record<Position, string> = {
  GK: "Goalkeeper", CB: "Centre-Back", LB: "Left-Back", RB: "Right-Back",
  CDM: "Def. Midfielder", CM: "Centre Midfielder", CAM: "Att. Midfielder",
  LW: "Left Winger", RW: "Right Winger", ST: "Striker",
};

export type Attributes = {
  overall: number;
  potential: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  goalkeeping: number;
};

export type SeasonStats = {
  apps: number;
  starts: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellows: number;
  reds: number;
  ratingSum: number;
  ratingCount: number;
  motm: number;
  teamWins?: number;
  teamDraws?: number;
  teamLosses?: number;
  teamGoalsFor?: number;
  teamGoalsAgainst?: number;
};

export type CareerSeasonRecord = {
  seasonIndex: number;
  age: number;
  clubId: string;
  competitionId: string; // primary league
  stats: SeasonStats;
  finishPosition?: number; // league position 1-20
};

export type TransferRecord = {
  id: string;
  fromClubId: string | null;
  toClubId: string;
  season: number;
  type: "signed" | "free" | "loan" | "renewal";
  fee: number; // in millions €
  wage: number; // per week in k€
};

export type TrophyRecord = {
  id: string;
  competitionId: string;
  season: number;
  clubId: string;
};

export type AwardRecord = {
  id: string;
  awardId: string;
  season: number;
  clubId: string;
  detail?: string; // e.g. "34 goals"
};

export type NewsItem = {
  id: string;
  season: number;
  matchday: number;
  title: string;
  body: string;
  tag: "match" | "transfer" | "trophy" | "award" | "rumor" | "injury";
};

export type SocialPost = {
  id: string;
  season: number;
  matchday: number;
  content: string;
  likes: number;
  comments: number;
  reposts: number;
};

export type MilestoneRecord = {
  id: string;
  type: "debut" | "goals" | "assists" | "apps" | "transfer" | "award" | "trophy" | "retirement";
  label: string;
  season: number;
  detail?: string;
};

export type SpinLogEntry = {
  id: string;
  type: "match" | "season" | "transfer";
  season: number;
  at: number;
  summary: string;
};

export type MatchSpinResult = {
  opponentClubId: string;
  home: boolean;
  selection: "starter" | "sub" | "benched" | "injured";
  minutes: number;
  goals: number;
  assists: number;
  yellow: boolean;
  red: boolean;
  cleanSheet: boolean;
  rating: number; // 1-10
  teamResult: "W" | "D" | "L";
  goalsFor: number;
  goalsAgainst: number;
  motm: boolean;
  injuryMatches: number;
};

export type Offer = {
  id: string;
  clubId: string;
  fee: number;
  wage: number;
  years: number;
  type: "transfer" | "renewal" | "free";
};

export type SeasonEndResult = {
  seasonIndex: number;
  leaguePosition: number;
  trophies: TrophyRecord[];
  awards: AwardRecord[];
  offers: Offer[];
  renewal?: Offer;
  playerOfTheYear?: boolean;
};

export type Save = {
  id: string;
  createdAt: number;
  updatedAt: number;
  seed: number;

  player: {
    name: string;
    countryCode: string;
    position: Position;
    age: number;
    height: number;
    foot: Foot;
    avatarSeed: string;
  };
  attributes: Attributes;
  currentClub: {
    clubId: string;
    shirtNumber: number;
    wage: number; // k€/week
    contractUntilSeason: number;
  };
  season: {
    index: number; // 1-based
    matchday: number; // matches played
    totalMatches: number;
    currentStats: SeasonStats;
  };
  careerStats: {
    apps: number;
    goals: number;
    assists: number;
    cleanSheets: number;
    trophies: number;
    awards: number;
  };
  history: CareerSeasonRecord[];
  transfers: TransferRecord[];
  trophies: TrophyRecord[];
  awards: AwardRecord[];
  milestones: MilestoneRecord[];
  news: NewsItem[];
  social: SocialPost[];
  spinLog: SpinLogEntry[];
  followers: number;
  status: "active" | "retired";
  retirement?: { season: number; reason: string; finalOverall: number };
  // pending state — spin result awaiting confirmation
  pending?:
    | { kind: "match"; result: MatchSpinResult; news: NewsItem; social?: SocialPost }
    | { kind: "season"; result: SeasonEndResult }
    | { kind: "transfer"; chosen: Offer };
};

export const emptySeasonStats = (): SeasonStats => ({
  apps: 0, starts: 0, goals: 0, assists: 0, cleanSheets: 0,
  yellows: 0, reds: 0, ratingSum: 0, ratingCount: 0, motm: 0,
  teamWins: 0, teamDraws: 0, teamLosses: 0, teamGoalsFor: 0, teamGoalsAgainst: 0,
});
