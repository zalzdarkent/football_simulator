import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useActiveSave, useStore } from "../lib/store";
import { useRequireSave } from "../hooks/use-require-save";
import { clubById } from "../data/clubs";
import { PlayerCard } from "../components/PlayerCard";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Dasbor — Become a Legend" }] }),
  component: Dashboard,
});

function Dashboard() {
  const save = useRequireSave();
  const navigate = useNavigate();
  const retire = useStore((s) => s.retire);
  if (!save) return null;

  const club = clubById(save.currentClub.clubId)!;
  const cs = save.season.currentStats;
  const avgRating = cs.ratingCount ? (cs.ratingSum / cs.ratingCount).toFixed(2) : "—";
  const seasonProgress = (save.season.matchday / save.season.totalMatches) * 100;
  const ovrProgress = ((save.attributes.overall - 50) / (save.attributes.potential - 50)) * 100;
  const seasonDone = save.season.matchday >= save.season.totalMatches;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-[280px_1fr] gap-8">
        <div className="space-y-4">
          <PlayerCard save={save} size="md" />
          <Card className="bg-card-gradient border-border/60">
            <CardContent className="p-4 text-sm space-y-2">
              <Row k="Klub" v={club.name} />
              <Row k="Kontrak" v={`${save.currentClub.contractUntilSeason} musim`} />
              <Row k="Gaji" v={`€${save.currentClub.wage}k/pekan`} />
              <Row k="Followers" v={fmt(save.followers)} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card-gradient border-border/60">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Musim {save.season.index}</div>
                  <h1 className="text-3xl font-display font-extrabold mt-1">Selamat datang kembali, {save.player.name.split(" ")[0]}!</h1>
                </div>
                {save.status === "retired" ? (
                  <span className="text-xs uppercase bg-muted rounded px-2 py-1">Pensiun</span>
                ) : (
                  <Button size="lg" onClick={() => navigate({ to: seasonDone ? "/dashboard/season-end" : "/dashboard/match" })}>
                    {seasonDone ? "Akhiri Musim" : "Main Pertandingan Berikutnya"}
                  </Button>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                <div>
                  <div className="flex justify-between text-xs mb-1"><span>Progress Musim</span><span>{save.season.matchday}/{save.season.totalMatches}</span></div>
                  <Progress value={seasonProgress} />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span>Overall → Potensi</span><span>{save.attributes.overall}/{save.attributes.potential}</span></div>
                  <Progress value={Math.max(0, Math.min(100, ovrProgress))} />
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="font-display font-bold mb-3 text-lg">Statistik musim ini</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat k="Apps" v={cs.apps} />
              <Stat k="Gol" v={cs.goals} />
              <Stat k="Assist" v={cs.assists} />
              <Stat k="Avg Rating" v={avgRating} />
              <Stat k="MOTM" v={cs.motm} />
              <Stat k="Clean Sheet" v={cs.cleanSheets} />
              <Stat k="Kuning" v={cs.yellows} />
              <Stat k="Merah" v={cs.reds} />
            </div>
          </div>

          <div>
            <h2 className="font-display font-bold mb-3 text-lg">Karier total</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat k="Apps" v={save.careerStats.apps} />
              <Stat k="Gol" v={save.careerStats.goals} />
              <Stat k="Assist" v={save.careerStats.assists} />
              <Stat k="Trofi" v={save.careerStats.trophies} />
            </div>
          </div>

          {save.status === "active" && (
            <div className="pt-4">
              <Button variant="ghost" onClick={() => {
                if (confirm("Yakin ingin pensiun? Karier akan berakhir.")) retire(save.id);
              }}>
                Pensiun sekarang
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}
function Stat({ k, v }: { k: string; v: number | string }) {
  return (
    <div className="bg-card-gradient border border-border/60 rounded-lg p-4">
      <div className="text-2xl font-display font-extrabold">{v}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{k}</div>
    </div>
  );
}
function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
