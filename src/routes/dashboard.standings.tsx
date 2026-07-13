import { createFileRoute } from "@tanstack/react-router";
import { useRequireSave } from "../hooks/use-require-save";
import { generateLeagueStandings } from "../lib/sim/league";
import { clubById } from "../lib/store";
import { api } from "../lib/api";
import { useEffect, useState } from "react";

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
  const [clubs, setClubs] = useState<Record<string, any>>({});

  useEffect(() => {
    api.getClubs().then((data) => {
      const clubMap: Record<string, any> = {};
      data.forEach((club: any) => {
        clubMap[club.id] = club;
      });
      setClubs(clubMap);
    }).catch(console.error);
  }, []);

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
                const club = clubs[row.clubId] || clubById(row.clubId);
                return (
                  <tr key={row.clubId} className={`transition-colors hover:bg-accent/5 ${isPlayer ? 'bg-primary/10' : ''}`}>
                    <td className="px-4 py-3 text-center text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <ClubBadgeIcon club={club} />
                      <span className={isPlayer ? 'text-primary font-bold' : ''}>{club?.name || row.name}</span>
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

function ClubBadgeIcon({ club }: { club: any }) {
  if (!club) return null;

  if (club.logoUrl) {
    return (
      <img
        src={club.logoUrl}
        alt={club.name}
        className="w-6 h-6 object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
        }}
      />
    );
  }

  const colors = club.colors || club.colorPrimary ? [club.colorPrimary, club.colorSecondary] : ["#000000", "#FFFFFF"];
  const short = club.short || club.name?.substring(0, 3).toUpperCase() || "???";

  return (
    <div
      className="w-6 h-6 rounded flex items-center justify-center font-display font-bold text-[10px]"
      style={{ backgroundColor: colors[0], color: colors[1] }}
    >
      {short.slice(0, 3)}
    </div>
  );
}
