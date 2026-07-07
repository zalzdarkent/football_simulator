import { createFileRoute } from "@tanstack/react-router";
import { useRequireSave } from "../hooks/use-require-save";
import { generateLeagueStandings } from "../lib/sim/league";
import { clubById } from "../data/clubs";

export const Route = createFileRoute("/dashboard/standings")({
  head: () => ({ meta: [{ title: "Klasemen Liga — Become a Legend" }] }),
  component: Standings,
});

function Standings() {
  const save = useRequireSave();
  if (!save) return null;

  const playerClub = clubById(save.currentClub.clubId);
  if (!playerClub) return null;

  const standings = generateLeagueStandings(save);

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-display font-extrabold mb-6">Klasemen Liga</h1>
      <div className="rounded-xl border border-border/60 bg-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-panel-2 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium text-center w-12">Pos</th>
                <th className="px-4 py-3 font-medium">Klub</th>
                <th className="px-4 py-3 font-medium text-center">MN</th>
                <th className="px-4 py-3 font-medium text-center">M</th>
                <th className="px-4 py-3 font-medium text-center">S</th>
                <th className="px-4 py-3 font-medium text-center">K</th>
                <th className="px-4 py-3 font-medium text-center">GM</th>
                <th className="px-4 py-3 font-medium text-center">GK</th>
                <th className="px-4 py-3 font-medium text-center">SG</th>
                <th className="px-4 py-3 font-bold text-center">Poin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {standings.map((row, index) => {
                const isPlayer = row.clubId === playerClub.id;
                return (
                  <tr key={row.clubId} className={`transition-colors hover:bg-accent/5 ${isPlayer ? 'bg-primary/10' : ''}`}>
                    <td className="px-4 py-3 text-center text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <ClubBadgeIcon id={row.clubId} />
                      <span className={isPlayer ? 'text-primary font-bold' : ''}>{row.name}</span>
                    </td>
                    <td className="px-4 py-3 text-center">{row.played}</td>
                    <td className="px-4 py-3 text-center">{row.w}</td>
                    <td className="px-4 py-3 text-center">{row.d}</td>
                    <td className="px-4 py-3 text-center">{row.l}</td>
                    <td className="px-4 py-3 text-center">{row.gf}</td>
                    <td className="px-4 py-3 text-center">{row.ga}</td>
                    <td className="px-4 py-3 text-center">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                    <td className="px-4 py-3 text-center font-bold text-foreground">{row.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function ClubBadgeIcon({ id }: { id: string }) {
  const c = clubById(id);
  if (!c) return null;
  return (
    <div
      className="w-6 h-6 rounded flex items-center justify-center font-display font-bold text-[10px]"
      style={{ backgroundColor: c.colors[0], color: c.colors[1] }}
    >
      {c.short.slice(0, 3)}
    </div>
  );
}
