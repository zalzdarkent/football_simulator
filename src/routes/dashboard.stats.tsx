import { createFileRoute } from "@tanstack/react-router";
import { useRequireSave } from "../hooks/use-require-save";
import { clubById } from "../lib/store";
import { Card, CardContent } from "../components/ui/card";

export const Route = createFileRoute("/dashboard/stats")({
  head: () => ({ meta: [{ title: "Statistik — Become a Legend" }] }),
  component: Stats,
});

function Stats() {
  const save = useRequireSave();
  if (!save) return null;
  const rows = [
    ...save.history.map((h) => ({
      season: h.seasonIndex, age: h.age, club: clubById(h.clubId)?.short ?? "—",
      apps: h.stats.apps, goals: h.stats.goals, assists: h.stats.assists,
      cs: h.stats.cleanSheets,
      rating: h.stats.ratingCount ? (h.stats.ratingSum / h.stats.ratingCount).toFixed(2) : "—",
      finish: h.finishPosition ?? "—",
    })),
    // current in-progress season
    {
      season: save.season.index, age: save.player.age,
      club: clubById(save.currentClub.clubId)?.short ?? "—",
      apps: save.season.currentStats.apps, goals: save.season.currentStats.goals,
      assists: save.season.currentStats.assists, cs: save.season.currentStats.cleanSheets,
      rating: save.season.currentStats.ratingCount
        ? (save.season.currentStats.ratingSum / save.season.currentStats.ratingCount).toFixed(2)
        : "—",
      finish: "—",
    },
  ];

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-display font-extrabold mb-2">Statistik Karier</h1>
      <p className="text-muted-foreground mb-6">Riwayat performa per musim.</p>
      <Card className="bg-card-gradient border-border/60">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground border-b border-border">
              <tr>
                <Th>Musim</Th><Th>Umur</Th><Th>Klub</Th><Th>Apps</Th><Th>Gol</Th><Th>Assist</Th>
                <Th>CS</Th><Th>Rating</Th><Th>Finish</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/60 last:border-0">
                  <Td>{r.season}</Td><Td>{r.age}</Td><Td>{r.club}</Td>
                  <Td>{r.apps}</Td>
                  <Td className="font-semibold text-primary">{r.goals}</Td>
                  <Td>{r.assists}</Td>
                  <Td>{r.cs}</Td>
                  <Td>{r.rating}</Td>
                  <Td>{r.finish === "—" ? "—" : `#${r.finish}`}</Td>
                </tr>
              ))}
              <tr className="bg-panel-2 font-semibold">
                <Td>Total</Td><Td></Td><Td></Td>
                <Td>{save.careerStats.apps}</Td>
                <Td className="text-primary">{save.careerStats.goals}</Td>
                <Td>{save.careerStats.assists}</Td>
                <Td>{save.careerStats.cleanSheets}</Td>
                <Td></Td><Td></Td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-3">{children}</th>;
}
function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
