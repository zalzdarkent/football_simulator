import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "../lib/store";
import { clubById } from "../data/clubs";
import { Card, CardContent } from "../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

export const Route = createFileRoute("/dashboard/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — Become a Legend" }] }),
  component: Leaderboard,
});

function Leaderboard() {
  const saves = useStore((s) => s.saves);
  const byGoals = [...saves].sort((a, b) => b.careerStats.goals - a.careerStats.goals);
  const byTrophies = [...saves].sort((a, b) => b.careerStats.trophies - a.careerStats.trophies);
  const byOvr = [...saves].sort((a, b) => b.attributes.overall - a.attributes.overall);
  const byApps = [...saves].sort((a, b) => b.careerStats.apps - a.careerStats.apps);

  if (saves.length === 0) {
    return <main className="max-w-3xl mx-auto p-10 text-center text-muted-foreground">Belum ada karier. Buat karier baru untuk mengisi leaderboard.</main>;
  }

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-display font-extrabold mb-6">Leaderboard</h1>
      <Tabs defaultValue="goals">
        <TabsList>
          <TabsTrigger value="goals">Top Skor</TabsTrigger>
          <TabsTrigger value="trophies">Terbanyak Trofi</TabsTrigger>
          <TabsTrigger value="ovr">Overall Tertinggi</TabsTrigger>
          <TabsTrigger value="apps">Karier Terpanjang</TabsTrigger>
        </TabsList>
        <TabsContent value="goals" className="mt-4"><Table rows={byGoals} valueKey="goals" label="Gol" /></TabsContent>
        <TabsContent value="trophies" className="mt-4"><Table rows={byTrophies} valueKey="trophies" label="Trofi" /></TabsContent>
        <TabsContent value="ovr" className="mt-4"><Table rows={byOvr} valueKey="ovr" label="OVR" /></TabsContent>
        <TabsContent value="apps" className="mt-4"><Table rows={byApps} valueKey="apps" label="Apps" /></TabsContent>
      </Tabs>
    </main>
  );
}

function Table({ rows, valueKey, label }: { rows: ReturnType<typeof useStore.getState>["saves"]; valueKey: "goals"|"trophies"|"ovr"|"apps"; label: string }) {
  const val = (r: typeof rows[number]) =>
    valueKey === "ovr" ? r.attributes.overall :
    valueKey === "apps" ? r.careerStats.apps :
    valueKey === "goals" ? r.careerStats.goals :
    r.careerStats.trophies;
  return (
    <Card className="bg-card-gradient border-border/60">
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground border-b border-border">
            <tr><th className="text-left px-4 py-3">#</th><th className="text-left px-4 py-3">Pemain</th><th className="text-left px-4 py-3">Klub</th><th className="text-right px-4 py-3">{label}</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-display font-bold">{i + 1}</td>
                <td className="px-4 py-3">{r.player.name} <span className="text-xs text-muted-foreground">· {r.player.position}</span></td>
                <td className="px-4 py-3">{clubById(r.currentClub.clubId)?.short ?? "—"}</td>
                <td className="px-4 py-3 text-right font-semibold text-primary">{val(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
