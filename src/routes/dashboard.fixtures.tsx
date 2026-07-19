import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { api } from "../lib/api";
import { useRequireSave } from "../hooks/use-require-save";

export const Route = createFileRoute("/dashboard/fixtures")({
  head: () => ({ meta: [{ title: "Jadwal Musim — Become a Legend" }] }),
  component: Fixtures,
});

type SeasonMatchRow = {
  id: string;
  competition_id: string;
  comp_name: string;
  comp_short: string;
  comp_scope: string;
  matchday: number | null;
  stage: string | null;
  order_key: number;
  opponent_club_id: string;
  opp_name: string;
  opp_short: string;
  opp_color: string | null;
  home: boolean;
  played: boolean;
  team_goals: number | null;
  opp_goals: number | null;
};

function Fixtures() {
  const save = useRequireSave();
  const [matches, setMatches] = useState<SeasonMatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!save) return;
    let cancelled = false;

    async function loadMatches() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getSeasonMatches(save.id, save.season.index);
        if (!cancelled) {
          setMatches(data as SeasonMatchRow[]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat jadwal musim");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMatches();

    return () => {
      cancelled = true;
    };
  }, [save]);

  const grouped = useMemo(() => {
    const byCompetition = new Map<string, SeasonMatchRow[]>();
    for (const match of matches) {
      const list = byCompetition.get(match.competition_id) ?? [];
      list.push(match);
      byCompetition.set(match.competition_id, list);
    }
    return [...byCompetition.entries()].map(([competitionId, rows]) => ({ competitionId, rows }));
  }, [matches]);

  if (!save) return null;

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Simulasi internal</div>
        <h1 className="text-3xl font-display font-extrabold mt-1">Jadwal Musim</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Ini bukan jadwal dari API. Semua pertandingan di sini diambil dari tabel <span className="font-medium">matches</span> milik save aktif kamu.
        </p>
      </div>

      <Card className="bg-card-gradient border-border/60">
        <CardContent className="p-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="rounded-full bg-panel px-3 py-1">Musim {save.season.index}</span>
          <span className="rounded-full bg-panel px-3 py-1">{matches.length} pertandingan</span>
          <span className="rounded-full bg-panel px-3 py-1">{matches.filter((m) => m.played).length} dimainkan</span>
          <span className="rounded-full bg-panel px-3 py-1">{matches.filter((m) => !m.played).length} sisa</span>
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Memuat jadwal musim...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && matches.length === 0 && (
        <Card className="bg-card-gradient border-border/60">
          <CardContent className="p-8 text-center text-muted-foreground">
            Belum ada jadwal. Mulai musim dulu supaya matches dibuat dari season setup.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {grouped.map(({ competitionId, rows }) => (
          <Card key={competitionId} className="bg-card-gradient border-border/60">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    {rows[0]?.comp_scope}
                  </div>
                  <div className="font-display font-bold text-lg">
                    {rows[0]?.comp_name ?? competitionId}
                  </div>
                </div>
                <span className="rounded-full bg-panel px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {rows.length} match
                </span>
              </div>

              <div className="space-y-3">
                {rows
                  .slice()
                  .sort((a, b) => a.order_key - b.order_key)
                  .map((match) => {
                    const hasScore = match.played && match.team_goals !== null && match.opp_goals !== null;
                    return (
                      <div
                        key={match.id}
                        className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/50 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="space-y-1">
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            {match.matchday ? `Matchday ${match.matchday}` : match.stage || `Order ${match.order_key + 1}`}
                          </div>
                          <div className="font-semibold">
                            {match.home ? "Kamu vs " : ""}{match.opp_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {match.home ? "Kandang" : "Tandang"} · {match.opp_short}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-display font-extrabold text-2xl">
                            {hasScore ? `${match.team_goals} - ${match.opp_goals}` : "VS"}
                          </div>
                          <div className={`text-xs uppercase tracking-[0.2em] ${match.played ? "text-emerald-600" : "text-muted-foreground"}`}>
                            {match.played ? "Selesai" : "Belum dimainkan"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
