import { create } from "zustand";
import type {
  Save,
  MatchSpinResult,
  NewsItem,
  SocialPost,
  SeasonEndResult,
  Offer,
  TransferRecord,
  Position,
  Foot,
  MilestoneRecord,
  SpinLogEntry,
} from "./sim/types";
import { emptySeasonStats } from "./sim/types";
import { mulberry32, randSeed, uid, range as rr } from "./sim/rng";
import { genInitialAttributes, ageAdjustment, computeOverall } from "./sim/attributes";
import { rollMatch } from "./sim/match";
import { rollSeasonEnd, shouldRetire } from "./sim/season";
import { api, ensureSession } from "../lib/api";

export type Club = {
  id: string;
  name: string;
  short: string;
  league: string;
  colors: [string, string];
  logoUrl: string;
  tier: number;
  reputation: number;
  city?: string;
};

export let CLUBS: Club[] = [];
export let LEAGUES: any[] = [];
export let COUNTRIES: any[] = [];
export let AWARDS: any = {};
export let COMPETITIONS: any[] = [];

export function competitionById(id: string) {
  return COMPETITIONS.find((c) => c.id === id);
}

export function clubById(id: string) {
  return CLUBS.find((c) => c.id === id);
}
export function clubsByLeague(leagueId: string) {
  return CLUBS.filter((c) => c.league === leagueId);
}
export function clubsByTier(tier: number) {
  return CLUBS.filter((c) => c.tier === tier);
}
export function countryByCode(code: string) {
  return COUNTRIES.find((c) => c.code === code || c.code === code.substring(0, 2));
}

type Store = {
  saves: Save[];
  activeSaveId: string | null;
  hydrated: boolean;
  sessionId: string | null;
  syncError: string | null;

  hydrate: () => Promise<void>;
  createSave: (input: {
    name: string;
    countryCode: string;
    position: Position;
    age: number;
    height: number;
    foot: Foot;
    clubId: string;
  }) => Promise<string>;
  deleteSave: (id: string) => Promise<void>;
  renameSave: (id: string, name: string) => Promise<void>;
  setActive: (id: string | null) => Promise<void>;
  importSave: (data: Save) => Promise<void>;

  previewMatch: (saveId: string) => Promise<{
    match: any;
    opponent: any;
    competition: any;
    result: any;
    previewSeed: number;
    news: NewsItem;
    social?: SocialPost;
  } | null>;

  confirmMatch: (
    saveId: string,
    rolled: {
      match: any;
      opponent: any;
      competition: any;
      result: any;
      previewSeed: number;
      news: NewsItem;
      social?: SocialPost;
    },
  ) => Promise<void>;

  clearPending: (saveId: string) => void;

  previewSeasonEnd: (saveId: string) => SeasonEndResult | null;
  confirmSeasonAndOffer: (
    saveId: string,
    chosen: Offer | { kind: "stay" },
    result: SeasonEndResult,
  ) => void;

  retire: (saveId: string) => void;
};

let sessionPromise: Promise<string> | null = null;

async function getSessionId(get: () => Store): Promise<string> {
  const existing = get().sessionId;
  if (existing) return existing;
  if (!sessionPromise) {
    sessionPromise = ensureSession().then((s) => s.sessionId);
  }
  const sessionId = await sessionPromise;
  sessionPromise = null;
  return sessionId;
}

async function persistSave(get: () => Store, save: Save) {
  const sessionId = await getSessionId(get);
  try {
    await api.updateSave(save);
  } catch {
    await api.createSave(sessionId, save);
  }
}

function syncSave(get: () => Store, save: Save) {
  persistSave(get, save).catch((err) => {
    console.error("Failed to sync save:", err);
    get().syncError = String(err);
  });
}

export const useStore = create<Store>()((set, get) => ({
  saves: [],
  activeSaveId: null,
  hydrated: false,
  sessionId: null,
  syncError: null,

  hydrate: async () => {
    try {
      const session = await ensureSession();
      const saves = await api.listSaves(session.sessionId);

      const masterRes = await fetch("http://localhost:3001/api/master");
      if (masterRes.ok) {
        const data = await masterRes.json();
        CLUBS = data.clubs.map((c: any) => ({
          id: c.id,
          name: c.name,
          short: c.short,
          league: c.league_id,
          colors: [c.color_primary, c.color_secondary],
          logoUrl: c.logo_url,
          tier: c.tier,
          reputation: c.reputation,
        }));
        LEAGUES = data.leagues;
        COUNTRIES = data.countries;
        COMPETITIONS = data.competitions;
        data.awards.forEach((a: any) => {
          AWARDS[a.id] = a;
        });
      }

      set({
        saves,
        activeSaveId: session.activeSaveId,
        sessionId: session.sessionId,
        hydrated: true,
        syncError: null,
      });
    } catch (err) {
      console.error("Failed to hydrate from API:", err);
      set({ hydrated: true, syncError: String(err) });
    }
  },

  createSave: async (input) => {
    const seed = randSeed();
    const rng = mulberry32(seed);
    const attributes = genInitialAttributes(input.position, input.age, rng);
    const club = clubById(input.clubId)!;
    const wage = Math.max(5, Math.round(attributes.overall * 0.6));

    const save: Save = {
      id: uid(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      seed,
      player: {
        name: input.name.trim(),
        countryCode: input.countryCode,
        position: input.position,
        age: input.age,
        height: input.height,
        foot: input.foot,
        avatarSeed: uid(),
      },
      attributes,
      currentClub: {
        clubId: club.id,
        shirtNumber: rr(7, 30, rng),
        wage,
        contractUntilSeason: 3,
      },
      season: { index: 1, matchday: 0, totalMatches: 38, currentStats: emptySeasonStats() },
      careerStats: { apps: 0, goals: 0, assists: 0, cleanSheets: 0, trophies: 0, awards: 0 },
      history: [],
      transfers: [
        {
          id: uid(),
          fromClubId: null,
          toClubId: club.id,
          season: 1,
          type: "signed",
          fee: 0,
          wage,
        },
      ],
      trophies: [],
      awards: [],
      milestones: [
        {
          id: uid(),
          type: "debut",
          label: `Debut profesional bersama ${club.name}`,
          season: 1,
        },
      ],
      news: [
        {
          id: uid(),
          season: 1,
          matchday: 0,
          tag: "transfer",
          title: `${input.name} resmi bergabung dengan ${club.name}`,
          body: `Karier profesional dimulai di ${club.name}. Selamat datang di panggung besar!`,
        },
      ],
      social: [
        {
          id: uid(),
          season: 1,
          matchday: 0,
          content: `Bab pertama karierku dimulai di ${club.name}. Kerja keras, doa keluarga, dan dukungan kalian. Ayo! 💪`,
          likes: rr(1000, 5000, rng),
          comments: rr(80, 400, rng),
          reposts: rr(50, 200, rng),
        },
      ],
      spinLog: [],
      followers: rr(2000, 12000, rng),
      status: "active",
    };

    const sessionId = await getSessionId(get);
    await api.createSave(sessionId, save);
    await api.setActiveSave(sessionId, save.id);
    await api.startSeason(save.id);
    set((s) => ({
      saves: [...s.saves, save],
      activeSaveId: save.id,
      sessionId,
    }));
    return save.id;
  },

  deleteSave: async (id) => {
    await api.deleteSave(id);
    const sessionId = await getSessionId(get);
    const nextActive = get().activeSaveId === id ? null : get().activeSaveId;
    if (get().activeSaveId === id) {
      await api.setActiveSave(sessionId, null);
    }
    set((s) => ({
      saves: s.saves.filter((x) => x.id !== id),
      activeSaveId: nextActive,
    }));
  },

  renameSave: async (id, name) => {
    const save = get().saves.find((x) => x.id === id);
    if (!save) return;
    const updated = { ...save, player: { ...save.player, name }, updatedAt: Date.now() };
    await persistSave(get, updated);
    set((s) => ({
      saves: s.saves.map((sv) => (sv.id === id ? updated : sv)),
    }));
  },

  setActive: async (id) => {
    const sessionId = await getSessionId(get);
    await api.setActiveSave(sessionId, id);
    set({ activeSaveId: id, sessionId });
  },

  importSave: async (data) => {
    const save = { ...data, id: uid(), updatedAt: Date.now() };
    const sessionId = await getSessionId(get);
    await api.createSave(sessionId, save);
    set((s) => ({ saves: [...s.saves, save] }));
  },

  previewMatch: async (saveId) => {
    const save = get().saves.find((x) => x.id === saveId);
    if (!save || save.status !== "active") return null;
    if (save.season.matchday >= save.season.totalMatches) return null;
    const data = await api.previewNextMatch(saveId);
    // Transform API response to match expected format
    return {
      result: {
        ...data.result,
        opponentClubId: data.match.opponent_club_id,
        goalsFor: data.result.team_goals,
        goalsAgainst: data.result.opp_goals,
      },
      match: data.match,
      opponent: data.opponent,
      competition: data.competition,
      previewSeed: data.previewSeed,
      news: data.news,
      social: data.social,
      opponentName: data.opponent.name,
    } as any;
  },

  confirmMatch: async (saveId, rolled) => {
    await api.commitMatch(saveId, rolled.match.id, rolled.previewSeed);
    // Transform for applyMatchResult
    const transformed = {
      ...rolled,
      result: {
        ...rolled.result,
        opponentClubId: rolled.match.opponent_club_id,
        goalsFor: rolled.result.team_goals,
        goalsAgainst: rolled.result.opp_goals,
      },
    };
    applyMatchResult(set, get, saveId, transformed);
  },

  clearPending: (saveId) =>
    set((s) => ({
      saves: s.saves.map((sv) => (sv.id === saveId ? { ...sv, pending: undefined } : sv)),
    })),

  previewSeasonEnd: (saveId) => {
    const save = get().saves.find((x) => x.id === saveId);
    if (!save) return null;
    return rollSeasonEnd(save, mulberry32(randSeed()));
  },

  confirmSeasonAndOffer: async (saveId, chosen, result) => {
    set((s) => ({
      saves: s.saves.map((sv) => {
        if (sv.id !== saveId) return sv;
        return advanceSeason(sv, result, chosen);
      }),
    }));
    const updated = get().saves.find((x) => x.id === saveId);
    if (updated) {
      await persistSave(get, updated);
      const seasonResult = await api.startSeason(saveId);
      if (seasonResult?.matches) {
        set((s) => ({
          saves: s.saves.map((sv) => {
            if (sv.id !== saveId) return sv;
            return { ...sv, season: { ...sv.season, totalMatches: seasonResult.matches } };
          }),
        }));
      }
    }
  },

  retire: (saveId) => {
    set((s) => ({
      saves: s.saves.map((sv) => {
        if (sv.id !== saveId) return sv;
        return {
          ...sv,
          status: "retired" as const,
          updatedAt: Date.now(),
          retirement: {
            season: sv.season.index,
            reason: "Voluntary",
            finalOverall: sv.attributes.overall,
          },
          milestones: [
            ...sv.milestones,
            {
              id: uid(),
              type: "retirement" as const,
              label: `Pensiun di usia ${sv.player.age} dengan overall ${sv.attributes.overall}`,
              season: sv.season.index,
            },
          ],
        };
      }),
    }));
    const updated = get().saves.find((x) => x.id === saveId);
    if (updated) syncSave(get, updated);
  },
}));

function applyMatchResult(
  set: (fn: (s: Store) => Partial<Store> | Store) => void,
  get: () => Store,
  saveId: string,
  rolled: { result: MatchSpinResult; news: NewsItem; social?: SocialPost } & {
    match?: any;
    team_goals?: number;
    opp_goals?: number;
  },
) {
  set((s) => ({
    saves: s.saves.map((sv) => {
      if (sv.id !== saveId) return sv;
      const played = rolled.result.selection === "starter" || rolled.result.selection === "sub";
      let suspendedMatches = sv.suspendedMatches || 0;
      if (suspendedMatches > 0) suspendedMatches--;
      else if (rolled.result.red) suspendedMatches = 1;

      let injuredMatches = sv.injuredMatches || 0;
      if (injuredMatches > 0) injuredMatches--;
      else if (rolled.result.injuryMatches > 0) injuredMatches = rolled.result.injuryMatches;
      const isApp = rolled.result.minutes > 0;
      const cs = sv.season.currentStats;
      const newSeasonStats = {
        apps: cs.apps + (isApp ? 1 : 0),
        starts: cs.starts + (rolled.result.selection === "starter" ? 1 : 0),
        goals: cs.goals + rolled.result.goals,
        assists: cs.assists + rolled.result.assists,
        cleanSheets: cs.cleanSheets + (rolled.result.cleanSheet ? 1 : 0),
        yellows: cs.yellows + (rolled.result.yellow ? 1 : 0),
        reds: cs.reds + (rolled.result.red ? 1 : 0),
        ratingSum: cs.ratingSum + (isApp ? rolled.result.rating : 0),
        ratingCount: cs.ratingCount + (isApp ? 1 : 0),
        motm: cs.motm + (rolled.result.motm ? 1 : 0),
        teamWins: (cs.teamWins || 0) + (rolled.result.teamResult === "W" ? 1 : 0),
        teamDraws: (cs.teamDraws || 0) + (rolled.result.teamResult === "D" ? 1 : 0),
        teamLosses: (cs.teamLosses || 0) + (rolled.result.teamResult === "L" ? 1 : 0),
        teamGoalsFor: (cs.teamGoalsFor || 0) + (rolled.result.team_goals ?? rolled.result.goalsFor),
        teamGoalsAgainst:
          (cs.teamGoalsAgainst || 0) + (rolled.result.opp_goals ?? rolled.result.goalsAgainst),
      };
      const milestones: MilestoneRecord[] = [...sv.milestones];
      const careerGoals = sv.careerStats.goals + rolled.result.goals;
      for (const mark of [10, 25, 50, 100, 200, 300]) {
        if (sv.careerStats.goals < mark && careerGoals >= mark) {
          milestones.push({
            id: uid(),
            type: "goals",
            label: `Mencapai ${mark} gol karier`,
            season: sv.season.index,
          });
        }
      }
      const opp = clubById(rolled.match.opponent_club_id)!;
      const log: SpinLogEntry = {
        id: uid(),
        type: "match",
        season: sv.season.index,
        at: Date.now(),
        summary:
          rolled.result.selection === "injured"
            ? `Cedera, absen • ${rolled.result.teamResult} ${rolled.result.team_goals ?? rolled.result.goalsFor}-${rolled.result.opp_goals ?? rolled.result.goalsAgainst}`
            : rolled.result.selection === "suspended"
              ? `Sanksi kartu, absen • ${rolled.result.teamResult} ${rolled.result.team_goals ?? rolled.result.goalsFor}-${rolled.result.opp_goals ?? rolled.result.goalsAgainst}`
              : `${rolled.result.teamResult} ${rolled.result.team_goals ?? rolled.result.goalsFor}-${rolled.result.opp_goals ?? rolled.result.goalsAgainst} • ${rolled.result.goals}G ${rolled.result.assists}A rating ${rolled.result.rating}`,
        opponentName: opp.name,
        matchType: "league",
      };
      return {
        ...sv,
        updatedAt: Date.now(),
        season: {
          ...sv.season,
          matchday: sv.season.matchday + 1,
          currentStats: newSeasonStats,
        },
        careerStats: {
          apps: sv.careerStats.apps + (isApp ? 1 : 0),
          goals: careerGoals,
          assists: sv.careerStats.assists + rolled.result.assists,
          cleanSheets: sv.careerStats.cleanSheets + (rolled.result.cleanSheet ? 1 : 0),
          trophies: sv.careerStats.trophies,
          awards: sv.careerStats.awards,
        },
        news: [rolled.news, ...sv.news].slice(0, 200),
        social: rolled.social ? [rolled.social, ...sv.social].slice(0, 200) : sv.social,
        followers:
          sv.followers +
          Math.max(
            0,
            rolled.result.goals * 8000 + (rolled.result.motm ? 15000 : 0) + (played ? 500 : 0),
          ),
        spinLog: [log, ...sv.spinLog].slice(0, 300),
        milestones,
        suspendedMatches,
        injuredMatches,
      };
    }),
  }));
  const updated = get().saves.find((x) => x.id === saveId);
  if (updated) syncSave(get, updated);
}

function advanceSeason(sv: Save, result: SeasonEndResult, chosen: Offer | { kind: "stay" }): Save {
  const club = clubById(sv.currentClub.clubId)!;
  const cs = sv.season.currentStats;
  const avgRating = cs.ratingCount ? cs.ratingSum / cs.ratingCount : 6.5;
  const perf = avgRating / 7 + Math.min(1, cs.goals / 20) * 0.3;

  const rng = mulberry32(sv.seed + sv.season.index * 7919);
  const ovrDelta = ageAdjustment(
    sv.player.age,
    sv.attributes.potential,
    sv.attributes.overall,
    perf,
    rng,
  );

  const attributes = { ...sv.attributes };
  const nudge = (k: keyof typeof attributes) => {
    attributes[k] = Math.max(
      20,
      Math.min(99, attributes[k] + Math.round(ovrDelta * 0.6 + (Math.random() - 0.5) * 2)),
    );
  };
  (
    ["pace", "shooting", "passing", "dribbling", "defending", "physical", "goalkeeping"] as const
  ).forEach(nudge);
  attributes.overall = Math.max(40, Math.min(99, computeOverall(attributes, sv.player.position)));

  const seasonRec = {
    seasonIndex: sv.season.index,
    age: sv.player.age,
    clubId: club.id,
    competitionId: club.league,
    stats: cs,
    finishPosition: result.leaguePosition,
  };
  const trophies = [...sv.trophies, ...result.trophies];
  const awards = [...sv.awards, ...result.awards];
  const milestones: MilestoneRecord[] = [...sv.milestones];
  result.trophies.forEach((t) =>
    milestones.push({
      id: uid(),
      type: "trophy",
      season: sv.season.index,
      label: `Juara ${t.competitionId.toUpperCase()} bersama ${club.short}`,
    }),
  );
  result.awards.forEach((a) =>
    milestones.push({
      id: uid(),
      type: "award",
      season: sv.season.index,
      label: `Menang ${AWARDS[a.awardId as keyof typeof AWARDS].name}`,
    }),
  );

  const news: NewsItem[] = [...sv.news];
  result.trophies.forEach((t) =>
    news.unshift({
      id: uid(),
      season: sv.season.index,
      matchday: sv.season.totalMatches,
      tag: "trophy",
      title: `${club.name} juara ${t.competitionId.toUpperCase()} musim ${sv.season.index}!`,
      body: `${sv.player.name} angkat trofi bersama ${club.name}.`,
    }),
  );
  result.awards.forEach((a) =>
    news.unshift({
      id: uid(),
      season: sv.season.index,
      matchday: sv.season.totalMatches,
      tag: "award",
      title: `${sv.player.name} menangkan ${AWARDS[a.awardId as keyof typeof AWARDS].name}`,
      body: a.detail ?? "Penghargaan bergengsi untuk performa musim ini.",
    }),
  );

  let currentClub = sv.currentClub;
  const transfers: TransferRecord[] = [...sv.transfers];
  const nextSeasonIndex = sv.season.index + 1;
  if ("kind" in chosen && chosen.kind === "stay") {
    currentClub = {
      ...currentClub,
      contractUntilSeason: Math.max(1, currentClub.contractUntilSeason - 1),
    };
  } else if (!("kind" in chosen)) {
    if (chosen.type === "renewal") {
      currentClub = { ...currentClub, wage: chosen.wage, contractUntilSeason: chosen.years };
      transfers.unshift({
        id: uid(),
        fromClubId: club.id,
        toClubId: club.id,
        season: nextSeasonIndex,
        type: "renewal",
        fee: 0,
        wage: chosen.wage,
      });
    } else {
      const toClub = clubById(chosen.clubId)!;
      transfers.unshift({
        id: uid(),
        fromClubId: club.id,
        toClubId: toClub.id,
        season: nextSeasonIndex,
        type: chosen.type === "free" ? "free" : "signed",
        fee: chosen.fee,
        wage: chosen.wage,
      });
      milestones.push({
        id: uid(),
        type: "transfer",
        season: nextSeasonIndex,
        label: `Transfer ke ${toClub.name} (€${chosen.fee}jt)`,
      });
      news.unshift({
        id: uid(),
        season: nextSeasonIndex,
        matchday: 0,
        tag: "transfer",
        title: `RESMI: ${sv.player.name} bergabung ${toClub.name}`,
        body: `Nilai transfer €${chosen.fee}jt, kontrak ${chosen.years} tahun.`,
      });
      currentClub = {
        clubId: toClub.id,
        shirtNumber: currentClub.shirtNumber,
        wage: chosen.wage,
        contractUntilSeason: chosen.years,
      };
    }
  }

  const nextAge = sv.player.age + 1;
  const followersDelta = 20000 + result.trophies.length * 80000 + result.awards.length * 100000;

  const retiring = shouldRetire({ ...sv, attributes, player: { ...sv.player, age: nextAge } });

  return {
    ...sv,
    updatedAt: Date.now(),
    player: { ...sv.player, age: nextAge },
    attributes,
    currentClub,
    season: {
      index: nextSeasonIndex,
      matchday: 0,
      totalMatches: 38,
      currentStats: emptySeasonStats(),
    },
    careerStats: {
      ...sv.careerStats,
      trophies: sv.careerStats.trophies + result.trophies.length,
      awards: sv.careerStats.awards + result.awards.length,
    },
    history: [...sv.history, seasonRec],
    transfers,
    trophies,
    awards,
    milestones,
    news,
    followers: sv.followers + followersDelta,
    spinLog: [
      {
        id: uid(),
        type: "season" as const,
        season: sv.season.index,
        at: Date.now(),
        summary: `Musim ${sv.season.index}: liga #${result.leaguePosition} • ${result.trophies.length} trofi • ${result.awards.length} award`,
      },
      ...sv.spinLog,
    ].slice(0, 300),
    status: retiring ? "retired" : "active",
    retirement: retiring
      ? { season: sv.season.index, reason: "End of career", finalOverall: attributes.overall }
      : undefined,
    pending: undefined,
  };
}

export const useActiveSave = () => {
  const { saves, activeSaveId } = useStore();
  return saves.find((x) => x.id === activeSaveId) ?? null;
};
