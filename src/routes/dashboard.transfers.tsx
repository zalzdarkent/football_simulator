import { createFileRoute } from "@tanstack/react-router";
import { useRequireSave } from "../hooks/use-require-save";
import { clubById } from "../data/clubs";
import { Card, CardContent } from "../components/ui/card";

export const Route = createFileRoute("/dashboard/transfers")({
  head: () => ({ meta: [{ title: "Riwayat Transfer — Become a Legend" }] }),
  component: Transfers,
});

const TYPE_LABEL: Record<string, string> = {
  signed: "Transfer", free: "Free transfer", loan: "Pinjaman", renewal: "Perpanjangan",
};

function Transfers() {
  const save = useRequireSave();
  if (!save) return null;
  const list = [...save.transfers].sort((a, b) => b.season - a.season);
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-display font-extrabold mb-6">Riwayat Transfer</h1>
      <div className="space-y-3">
        {list.map((t) => {
          const from = t.fromClubId ? clubById(t.fromClubId) : null;
          const to = clubById(t.toClubId)!;
          return (
            <Card key={t.id} className="bg-card-gradient border-border/60">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground w-16">
                    Musim {t.season}
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <Badge club={from} />
                    <span className="text-muted-foreground">→</span>
                    <Badge club={to} />
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold">{TYPE_LABEL[t.type]}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.fee > 0 ? `€${t.fee}jt` : "—"} · €{t.wage}k/pekan
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}

function Badge({ club }: { club: ReturnType<typeof clubById> | null }) {
  if (!club) return <span className="text-xs text-muted-foreground">— Debut —</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-display font-bold"
        style={{ backgroundColor: club.colors[0], color: club.colors[1] }}>
        {club.short}
      </div>
      <span className="text-sm">{club.name}</span>
    </div>
  );
}
