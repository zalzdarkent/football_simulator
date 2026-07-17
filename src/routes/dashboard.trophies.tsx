import { createFileRoute } from "@tanstack/react-router";
import { useRequireSave } from "../hooks/use-require-save";
import { clubById } from "../lib/store";
import { competitionById, AWARDS } from "../lib/store";
import { Card, CardContent } from "../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

export const Route = createFileRoute("/dashboard/trophies")({
  head: () => ({ meta: [{ title: "Trofi & Penghargaan — Become a Legend" }] }),
  component: Trophies,
});

function Trophies() {
  const save = useRequireSave();
  if (!save) return null;

  const trophiesByComp = groupBy(save.trophies, (t) => t.competitionId);
  const awardsByType = groupBy(save.awards, (a) => a.awardId);

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-display font-extrabold mb-6">Lemari Prestasi</h1>
      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team">Trofi Tim ({save.trophies.length})</TabsTrigger>
          <TabsTrigger value="personal">Penghargaan Pribadi ({save.awards.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="team" className="mt-4">
          {save.trophies.length === 0 ? (
            <Empty msg="Belum ada trofi. Menangkan liga atau piala untuk mengisi lemari!" />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(trophiesByComp).map(([compId, list]) => (
                <Card key={compId} className="bg-card-gradient border-border/60">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-3xl">🏆</div>
                      <div>
                        <div className="font-display font-bold">{competitionById(compId)?.name ?? compId}</div>
                        <div className="text-xs text-muted-foreground">×{list.length}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {list.map((t) => (
                        <SeasonClubChip key={t.id} season={t.season} club={clubById(t.clubId) ?? null} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="personal" className="mt-4">
          {save.awards.length === 0 ? (
            <Empty msg="Belum ada penghargaan pribadi. Terus tampil gemilang!" />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(awardsByType).map(([awardId, list]) => {
                const meta = AWARDS[awardId as keyof typeof AWARDS];
                return (
                  <Card key={awardId} className="bg-card-gradient border-border/60">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-3xl">{meta.icon}</div>
                        <div>
                          <div className="font-display font-bold">{meta.name}</div>
                          <div className="text-xs text-muted-foreground">×{list.length}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {list.map((a) => (
                          <SeasonClubChip key={a.id} season={a.season} club={clubById(a.clubId) ?? null} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <Card className="bg-card-gradient border-border/60">
      <CardContent className="p-10 text-center text-muted-foreground">{msg}</CardContent>
    </Card>
  );
}

function groupBy<T>(arr: T[], key: (x: T) => string): Record<string, T[]> {
  return arr.reduce((acc, x) => {
    const k = key(x);
    (acc[k] ||= []).push(x);
    return acc;
  }, {} as Record<string, T[]>);
}

function SeasonClubChip({ season, club }: { season: number; club: { name: string; short: string; logoUrl?: string; colors?: [string, string] } | null }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-panel-2 rounded px-2 py-0.5">
      <span>S{season}</span>
      <span className="text-muted-foreground">·</span>
      {club ? (
        <>
          {club.logoUrl ? (
            <img
              src={club.logoUrl}
              alt={club.name}
              title={club.name}
              className="w-4 h-4 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}
          <span
            title={club.name}
            className={`w-4 h-4 rounded-sm flex items-center justify-center text-[7px] font-display font-bold ${club.logoUrl ? "hidden" : ""}`}
            style={{ backgroundColor: club.colors?.[0] || "#333", color: club.colors?.[1] || "#fff" }}
          >
            {club.short}
          </span>
        </>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </span>
  );
}