import { useEffect, useState } from "react";
import { footballApi, convertApiTeamToClub } from "../lib/football-api";

interface ApiTeam {
  team: {
    id: number;
    name: string;
    code: string;
    country: string;
    logo: string;
  };
  venue: {
    city: string;
  };
}

export function RealTimeTeams() {
  const [teams, setTeams] = useState<ApiTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<"epl" | "laliga" | "seriea">("epl");

  useEffect(() => {
    async function fetchTeams() {
      try {
        setLoading(true);
        setError(null);
        const data = await footballApi.getTeams(selectedLeague, 2024);
        setTeams(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch teams");
        console.error("Error fetching teams:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTeams();
  }, [selectedLeague]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading teams...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Error: {error}</p>
        <p className="text-sm text-red-600 mt-2">
          Make sure VITE_FOOTBALL_API_KEY is set in your .env file
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Real-Time Team Data</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedLeague("epl")}
            className={`px-4 py-2 rounded ${
              selectedLeague === "epl"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            Premier League
          </button>
          <button
            onClick={() => setSelectedLeague("laliga")}
            className={`px-4 py-2 rounded ${
              selectedLeague === "laliga"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            La Liga
          </button>
          <button
            onClick={() => setSelectedLeague("seriea")}
            className={`px-4 py-2 rounded ${
              selectedLeague === "seriea"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            Serie A
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => (
          <div
            key={team.team.id}
            className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <img
                src={team.team.logo}
                alt={team.team.name}
                className="w-12 h-12 object-contain"
              />
              <div>
                <h3 className="font-semibold">{team.team.name}</h3>
                <p className="text-sm text-gray-600">{team.team.code}</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>🏟️ {team.venue.city}</p>
              <p>🌍 {team.team.country}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> This data is fetched in real-time from API-Football. 
          You can use the <code>convertApiTeamToClub()</code> helper function to convert 
          this data to match your existing Club structure.
        </p>
      </div>
    </div>
  );
}
