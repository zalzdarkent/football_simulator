// API-Football service for fetching real football data (Node.js version)
// Free tier: https://www.api-football.com/

import dotenv from "dotenv";

dotenv.config();

const API_BASE = "https://v3.football.api-sports.io";
const API_KEY = process.env.VITE_FOOTBALL_API_KEY || process.env.FOOTBALL_API_KEY;

if (!API_KEY) {
  throw new Error("FOOTBALL_API_KEY or VITE_FOOTBALL_API_KEY not set in environment");
}

// League IDs from API-Football
export const LEAGUE_IDS = {
  epl: 39,
  laliga: 140,
  seriea: 135,
  bundesliga: 78,
  ligue1: 61,
  eredivisie: 88,
  "liga-pt": 94,
  "super-lig": 203,
  mls: 253,
  saudi: 307,
  ucl: 2,
  uel: 3,
  uecl: 5,
} as const;

export type LeagueCode = keyof typeof LEAGUE_IDS;

interface ApiResponse<T> {
  results: number;
  response: T[];
}

interface Team {
  team: {
    id: number;
    name: string;
    code: string;
    country: string;
    founded: number;
    national: boolean;
    logo: string;
  };
  venue: {
    id: number;
    name: string;
    city: string;
    capacity: number;
    image: string;
    address: string;
    surface: string;
  };
}

interface Player {
  player: {
    id: number;
    name: string;
    firstname: string;
    lastname: string;
    age: number;
    birth: {
      date: string;
      place: string;
      country: string;
    };
    nationality: string;
    height: string;
    weight: string;
    injured: boolean;
    photo: string;
  };
  statistics: Array<{
    team: {
      id: number;
      name: string;
      logo: string;
    };
    league: {
      id: number;
      name: string;
      country: string;
      logo: string;
      flag: string;
      season: number;
    };
    games: {
      appearences: number;
      lineups: number;
      minutes: number;
      number: number;
      position: string;
      rating: string;
      captain: boolean;
    };
    substitutes: {
      in: number;
      out: number;
      bench: number;
    };
    shots: {
      total: number;
      on: number;
    };
    goals: {
      total: number;
      conceded: number;
      assists: number;
      saves: number;
    };
    passes: {
      total: number;
      key: number;
      accuracy: number;
    };
    tackles: {
      total: number;
      blocks: number;
      interceptions: number;
    };
    duels: {
      total: number;
      won: number;
    };
    dribbles: {
      attempts: number;
      success: number;
      past: number;
    };
    fouls: {
      drawn: number;
      committed: number;
    };
    cards: {
      yellow: number;
      yellowred: number;
      red: number;
    };
    penalty: {
      won: number;
      commited: number;
      scored: number;
      missed: number;
      saved: number;
    };
  }>;
}

interface League {
  league: {
    id: number;
    name: string;
    type: string;
    logo: string;
  };
  country: {
    name: string;
    code: string;
    flag: string;
  };
  seasons: Array<{
    year: number;
    start: string;
    end: string;
    current: boolean;
    coverage: {
      fixtures: {
        events: boolean;
        lineups: boolean;
        statistics_fixtures: boolean;
        statistics_players: boolean;
        standings: boolean;
        players: boolean;
        top_scorers: boolean;
        top_assists: boolean;
        top_cards: boolean;
        injuries: boolean;
        predictions: boolean;
        odds: boolean;
      };
    };
  }>;
}

async function request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const headers: Record<string, string> = {
    "x-rapidapi-host": "v3.football.api-sports.io",
  };

  if (API_KEY) {
    headers["x-rapidapi-key"] = API_KEY;
  }

  const response = await fetch(url.toString(), {
    headers,
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export const footballApi = {
  // Get teams by league
  getTeams: async (leagueCode: LeagueCode, season: number = 2024) => {
    const leagueId = LEAGUE_IDS[leagueCode];
    const data = await request<ApiResponse<Team>>(`/teams`, {
      league: leagueId.toString(),
      season: season.toString(),
    });
    return data.response;
  },

  // Get team by ID
  getTeam: async (teamId: number) => {
    const data = await request<ApiResponse<Team>>(`/teams`, {
      id: teamId.toString(),
    });
    return data.response[0];
  },

  // Get players by team
  getPlayers: async (teamId: number, season: number = 2024) => {
    const data = await request<ApiResponse<Player>>(`/players`, {
      team: teamId.toString(),
      season: season.toString(),
    });
    return data.response;
  },

  // Get player by ID
  getPlayer: async (playerId: number, season: number = 2024) => {
    const data = await request<ApiResponse<Player>>(`/players`, {
      id: playerId.toString(),
      season: season.toString(),
    });
    return data.response[0];
  },

  // Search player by name
  searchPlayer: async (name: string) => {
    const data = await request<ApiResponse<Player>>(`/players`, {
      search: name,
    });
    return data.response;
  },

  // Get leagues
  getLeagues: async () => {
    const data = await request<ApiResponse<League>>(`/leagues`);
    return data.response;
  },

  // Get league by ID
  getLeague: async (leagueCode: LeagueCode) => {
    const leagueId = LEAGUE_IDS[leagueCode];
    const data = await request<ApiResponse<League>>(`/leagues`, {
      id: leagueId.toString(),
    });
    return data.response[0];
  },

  // Get top scorers for a league
  getTopScorers: async (leagueCode: LeagueCode, season: number = 2024) => {
    const leagueId = LEAGUE_IDS[leagueCode];
    const data = await request<ApiResponse<Player>>(`/players/topscorers`, {
      league: leagueId.toString(),
      season: season.toString(),
    });
    return data.response;
  },

  // Get top assists for a league
  getTopAssists: async (leagueCode: LeagueCode, season: number = 2024) => {
    const leagueId = LEAGUE_IDS[leagueCode];
    const data = await request<ApiResponse<Player>>(`/players/topassists`, {
      league: leagueId.toString(),
      season: season.toString(),
    });
    return data.response;
  },
};
