import { createFileRoute } from "@tanstack/react-router";
import { useRequireSave } from "../hooks/use-require-save";
import { Card, CardContent } from "../components/ui/card";

export const Route = createFileRoute("/dashboard/journey")({
  head: () => ({ meta: [{ title: "Perjalanan Karier — Become a Legend" }] }),
  component: Journey,
});

const ICONS = {
  debut: "🎬", transfer: "🔁", goals: "⚽", assists: "🅰️",
  apps: "👟", trophy: "🏆", award: "🏅", retirement: "🏁",
} as const;

function Journey() {
  const save = useRequireSave();
  if (!save) return null;
  const sorted = [...save.milestones].sort((a, b) => a.season - b.season);

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-display font-extrabold mb-2">Perjalanan Karier</h1>
      <p className="text-muted-foreground mb-6">Momen-momen penting dari karier {save.player.name}.</p>

      <div className="relative">
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />
        <div className="space-y-4">
          {sorted.map((m) => (
            <div key={m.id} className="flex gap-4 items-start">
              <div className="relative z-10 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                {ICONS[m.type]}
              </div>
              <Card className="flex-1 bg-card-gradient border-border/60">
                <CardContent className="p-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Musim {m.season}</div>
                  <div className="font-medium mt-1">{m.label}</div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
