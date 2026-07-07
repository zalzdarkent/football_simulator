import { createFileRoute } from "@tanstack/react-router";
import { useRequireSave } from "../hooks/use-require-save";
import { Card, CardContent } from "../components/ui/card";

export const Route = createFileRoute("/dashboard/news")({
  head: () => ({ meta: [{ title: "Berita — Become a Legend" }] }),
  component: News,
});

const TAG_COLOR: Record<string, string> = {
  match: "bg-secondary text-secondary-foreground",
  transfer: "bg-primary text-primary-foreground",
  trophy: "bg-[color:var(--gold)] text-[color:var(--gold-foreground)]",
  award: "bg-[color:var(--gold)] text-[color:var(--gold-foreground)]",
  rumor: "bg-muted text-muted-foreground",
  injury: "bg-destructive text-destructive-foreground",
};

function News() {
  const save = useRequireSave();
  if (!save) return null;
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-display font-extrabold mb-6">Berita</h1>
      <div className="space-y-3">
        {save.news.length === 0 && <p className="text-muted-foreground">Belum ada berita.</p>}
        {save.news.map((n) => (
          <Card key={n.id} className="bg-card-gradient border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] uppercase tracking-widest rounded px-1.5 py-0.5 font-semibold ${TAG_COLOR[n.tag]}`}>
                  {n.tag}
                </span>
                <span className="text-xs text-muted-foreground">Musim {n.season} · Pekan {n.matchday}</span>
              </div>
              <div className="font-medium">{n.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{n.body}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
