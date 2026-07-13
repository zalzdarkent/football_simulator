import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useActiveSave } from "../lib/store";
import { clubById } from "../lib/store";
import { getStoredUsername, clearAuth } from "../lib/api";
import { Button } from "./ui/button";

const NAV = [
  { to: "/dashboard", label: "Dasbor" },
  { to: "/dashboard/match", label: "Pertandingan" },
  { to: "/dashboard/stats", label: "Statistik" },
  { to: "/dashboard/trophies", label: "Trofi" },
  { to: "/dashboard/journey", label: "Perjalanan" },
  { to: "/dashboard/news", label: "Berita" },
  { to: "/dashboard/social", label: "Sosmed" },
  { to: "/dashboard/transfers", label: "Transfer" },
  { to: "/dashboard/standings", label: "Klasemen" },
  { to: "/dashboard/leaderboard", label: "Leaderboard" },
  { to: "/dashboard/settings", label: "Pengaturan" },
] as const;

export function AppHeader() {
  const save = useActiveSave();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const username = getStoredUsername();
  const club = save ? clubById(save.currentClub.clubId) : null;

  const handleLogout = () => {
    clearAuth();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-display font-extrabold">
          <span className="text-primary">⚽</span>
          <span>Become a Legend</span>
        </Link>
        <div className="flex items-center gap-4">
          {save && (
            <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{save.player.name}</span>
              {club && (
                <>
                  <span>•</span>
                  <span>{club.short}</span>
                  <span>•</span>
                  <span>Musim {save.season.index}</span>
                  <span>•</span>
                  <span>OVR {save.attributes.overall}</span>
                </>
              )}
            </div>
          )}
          {username && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{username}</span>
              <Button size="sm" variant="ghost" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
      {save && (
        <nav className="max-w-7xl mx-auto px-2 pb-2 flex gap-1 overflow-x-auto no-scrollbar">
          {NAV.map((n) => {
            const active = n.to === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
