import { createFileRoute } from "@tanstack/react-router";
import { useRequireSave } from "../hooks/use-require-save";
import { Card, CardContent } from "../components/ui/card";

export const Route = createFileRoute("/dashboard/social")({
  head: () => ({ meta: [{ title: "Sosmed — Become a Legend" }] }),
  component: Social,
});

function Social() {
  const save = useRequireSave();
  if (!save) return null;
  return (
    <main className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-extrabold">Feed Sosial</h1>
          <div className="text-sm text-muted-foreground">{fmt(save.followers)} followers</div>
        </div>
        <div className="text-4xl">📱</div>
      </div>
      <div className="space-y-3">
        {save.social.length === 0 && <p className="text-muted-foreground">Belum ada postingan.</p>}
        {save.social.map((p) => (
          <Card key={p.id} className="bg-card-gradient border-border/60">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg">👤</div>
                <div className="flex-1">
                  <div className="text-sm">
                    <span className="font-semibold">{save.player.name}</span>
                    <span className="text-muted-foreground ml-2">· S{p.season} P{p.matchday}</span>
                  </div>
                  <div className="mt-1 text-sm">{p.content}</div>
                  <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                    <span>❤️ {fmt(p.likes)}</span>
                    <span>💬 {fmt(p.comments)}</span>
                    <span>🔁 {fmt(p.reposts)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
