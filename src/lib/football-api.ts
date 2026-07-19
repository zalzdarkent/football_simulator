// RapidAPI football service for fetching real football data.
// Provider: free-api-live-football-data.p.rapidapi.com

const API_BASE = "https://free-api-live-football-data.p.rapidapi.com";
const API_HOST = "free-api-live-football-data.p.rapidapi.com";
const API_KEY =
  import.meta.env.VITE_RAPIDAPI_FOOTBALL_KEY ||
  import.meta.env.VITE_FOOTBALL_API_KEY ||
  "";

export const LEAGUE_IDS = {
  epl: 47,
  laliga: 87,
  seriea: 55,
  bundesliga: 54,
  ligue1: 53,
  eredivisie: 57,
  "liga-pt": 61,
  "super-lig": 71,
  mls: 130,
  saudi: 536,
  ucl: 42,
  uel: 73,
  uecl: 10216,
} as const;

export type LeagueCode = keyof typeof LEAGUE_IDS;

interface RapidCountry {
  ccode: string;
  name: string;
  localizedName: string;
}

interface RapidLeagueCatalogResponse {
  leagues: Array<{
    ccode: string;
    name: string;
    localizedName: string;
    leagues: Array<{
      id: number;
      name: string;
      localizedName: string;
      ccode: string;
      logo: string;
    }>;
  }>;
}

interface FixtureStatus {
  utcTime: string;
  halfs: {
    firstHalfStarted?: string;
    secondHalfStarted?: string;
  };
  periodLength: number;
  finished: boolean;
  started: boolean;
  cancelled: boolean;
  ongoing?: boolean;
  scoreStr?: string;
  liveTime?: {
    short: string;
    shortKey: string;
    long: string;
    longKey: string;
    maxTime: number;
    basePeriod: number;
    addedTime: number;
  };
  awarded?: boolean;
  reason?: {
    short: string;
    shortKey: string;
    long: string;
    longKey: string;
  };
}

interface FixtureMatch {
  id: number;
  leagueId: number;
  time: string;
  home: {
    id: number;
    score: number;
    name: string;
    longName: string;
  };
  away: {
    id: number;
    score: number;
    name: string;
    longName: string;
  };
  eliminatedTeamId: number | null;
  statusId: number;
  tournamentStage: string;
  status: FixtureStatus;
  timeTS: number;
}

interface RapidResponse<T> {
  status: string;
  response: T;
}

interface ClubTeam {
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

interface FlattenedLeague {
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
  seasons: never[];
}

const logoCache = new Map<number, string>();
let leagueCatalogCache: FlattenedLeague[] | null = null;

async function request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}${endpoint}`);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: {
      "x-rapidapi-host": API_HOST,
      "x-rapidapi-key": API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function normalizeLeagueName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

function toApiDate(date: string | Date) {
  if (date instanceof Date) {
    return date.toISOString().slice(0, 10).replaceAll("-", "");
  }
  return date.includes("-") ? date.replaceAll("-", "") : date;
}

async function loadLeagueCatalog(): Promise<FlattenedLeague[]> {
  if (leagueCatalogCache) return leagueCatalogCache;

  const data = await request<RapidResponse<RapidLeagueCatalogResponse>>("/football-get-all-leagues-with-countries");
  leagueCatalogCache = data.response.leagues.flatMap((country) =>
    country.leagues.map((league) => ({
      league: {
        id: league.id,
        name: normalizeLeagueName(league.name),
        type: "league",
        logo: league.logo,
      },
      country: {
        name: country.localizedName || country.name,
        code: league.ccode,
        flag: "",
      },
      seasons: [],
    })),
  );

  return leagueCatalogCache;
}

async function getTeamLogo(teamId: number) {
  const cached = logoCache.get(teamId);
  if (cached) return cached;

  const data = await request<RapidResponse<{ url: string }>>("/football-team-logo", {
    teamid: teamId.toString(),
  });

  const logo = data.response?.url ?? "";
  logoCache.set(teamId, logo);
  return logo;
}

async function getFixturesByLeagueId(leagueId: number) {
  const data = await request<RapidResponse<{ matches: FixtureMatch[] }>>("/football-get-all-matches-by-league", {
    leagueid: leagueId.toString(),
  });
  return data.response.matches ?? [];
}

async function getTeamsByLeagueId(leagueId: number): Promise<ClubTeam[]> {
  const [fixtures, catalog] = await Promise.all([getFixturesByLeagueId(leagueId), loadLeagueCatalog()]);
  const league = catalog.find((item) => item.league.id === leagueId);
  const countryName = league?.country.name ?? "";

  const teams = new Map<number, ClubTeam>();

  for (const match of fixtures) {
    for (const side of [match.home, match.away]) {
      if (teams.has(side.id)) continue;

      teams.set(side.id, {
        team: {
          id: side.id,
          name: side.longName || side.name,
          code: (side.name || side.longName || String(side.id)).slice(0, 3).toUpperCase(),
          country: countryName,
          founded: 0,
          national: false,
          logo: await getTeamLogo(side.id),
        },
        venue: {
          id: 0,
          name: side.longName || side.name,
          city: countryName,
          capacity: 0,
          image: "",
          address: "",
          surface: "",
        },
      });
    }
  }

  return [...teams.values()];
}

export const footballApi = {
  getCountries: async () => {
    const data = await request<RapidResponse<{ countries: RapidCountry[] }>>("/football-get-all-countries");
    return data.response.countries ?? [];
  },

  getLeagues: async () => {
    return loadLeagueCatalog();
  },

  getLeague: async (leagueCode: LeagueCode) => {
    const leagueId = LEAGUE_IDS[leagueCode];
    const catalog = await loadLeagueCatalog();
    const league = catalog.find((item) => item.league.id === leagueId);

    if (!league) {
      throw new Error(`League not found for code: ${leagueCode}`);
    }

    return league;
  },

  getTeams: async (leagueCode: LeagueCode) => {
    return getTeamsByLeagueId(LEAGUE_IDS[leagueCode]);
  },

  getTeamsById: async (leagueId: number) => {
    return getTeamsByLeagueId(leagueId);
  },

  getTeam: async (teamId: number) => {
    const logo = await getTeamLogo(teamId);
    return {
      team: {
        id: teamId,
        name: `Team ${teamId}`,
        code: String(teamId).slice(0, 3).toUpperCase(),
        country: "",
        founded: 0,
        national: false,
        logo,
      },
      venue: {
        id: 0,
        name: "",
        city: "",
        capacity: 0,
        image: "",
        address: "",
        surface: "",
      },
    } satisfies ClubTeam;
  },

  getPlayers: async () => {
    throw new Error("Player sync is not available for this RapidAPI football provider.");
  },

  getPlayer: async () => {
    throw new Error("Player sync is not available for this RapidAPI football provider.");
  },

  searchPlayer: async () => {
    throw new Error("Player sync is not available for this RapidAPI football provider.");
  },

  getTopScorers: async () => {
    throw new Error("Top scorer sync is not available for this RapidAPI football provider.");
  },

  getTopAssists: async () => {
    throw new Error("Top assist sync is not available for this RapidAPI football provider.");
  },

  getFixturesByDate: async (date: string | Date) => {
    const data = await request<RapidResponse<{ matches: FixtureMatch[] }>>("/football-get-matches-by-date", {
      date: toApiDate(date),
    });
    return data.response.matches ?? [];
  },

  getFixturesByLeagueId,

  getTeamLogo,
};
