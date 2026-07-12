# Football API Integration

This project now supports real football data from [API-Football](https://www.api-football.com/).

## Setup

### 1. Get API Key

1. Go to [API-Football](https://www.api-football.com/)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Free tier includes 100 requests/day

### 2. Configure Environment

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Add your API key to `.env`:
```
VITE_FOOTBALL_API_KEY=your_actual_api_key_here
```

### 3. Fetch Real Data

Run the data fetching script to populate your database with real football data:

```bash
bun scripts/fetch-football-data.ts
```

This will fetch:
- Teams from all supported leagues
- Player data for each team
- League information
- Top scorers

The data will be saved to `src/data/` as JSON files:
- `teams-raw.json` - Raw team data
- `players-raw.json` - Raw player data  
- `leagues-raw.json` - Raw league data
- `top-scorers-raw.json` - Top scorers data

## Supported Leagues

- Premier League (England)
- La Liga (Spain)
- Serie A (Italy)
- Bundesliga (Germany)
- Ligue 1 (France)
- Eredivisie (Netherlands)
- Liga Portugal (Portugal)
- Süper Lig (Turkey)
- MLS (USA)
- Saudi Pro League (Saudi Arabia)

## API Service

The API service is located at `src/lib/football-api.ts` and includes:

### Available Functions

```typescript
// Get teams by league
footballApi.getTeams(leagueCode, season)

// Get team by ID
footballApi.getTeam(teamId)

// Get players by team
footballApi.getPlayers(teamId, season)

// Get player by ID
footballApi.getPlayer(playerId, season)

// Search player by name
footballApi.searchPlayer(name)

// Get leagues
footballApi.getLeagues()

// Get league by code
footballApi.getLeague(leagueCode)

// Get top scorers
footballApi.getTopScorers(leagueCode, season)

// Get top assists
footballApi.getTopAssists(leagueCode, season)
```

### Helper Functions

```typescript
// Convert API team data to app's Club format
convertApiTeamToClub(apiTeam, leagueCode)

// Convert API player data to app's Player format
convertApiPlayerToAppPlayer(apiPlayer)
```

## Rate Limits

The free tier of API-Football has:
- 100 requests per day
- 10 requests per minute

The fetching script includes delays to respect these limits. If you need more requests, consider upgrading to a paid plan.

## Data Structure

### Team Data
```typescript
{
  id: string;
  name: string;
  code: string;
  country: string;
  founded: number;
  logo: string;
  venue: {
    name: string;
    city: string;
    capacity: number;
  };
  league: LeagueCode;
}
```

### Player Data
```typescript
{
  id: string;
  name: string;
  firstname: string;
  lastname: string;
  age: number;
  nationality: string;
  photo: string;
  height: string;
  weight: string;
  injured: boolean;
  teamId: string;
  teamName: string;
  statistics: PlayerStatistics[];
}
```

## Integration with Existing Data

The existing data files (`src/data/clubs.ts`, `src/data/countries.ts`, `src/data/awards.ts`) can be updated to use the real API data. The helper functions in `football-api.ts` can convert API responses to match your existing data structure.

## Troubleshooting

### API Key Not Working
- Verify your API key is correct in `.env`
- Check if your API key is active on the API-Football dashboard
- Ensure you haven't exceeded your daily request limit

### Rate Limit Errors
- Wait before making more requests
- Consider upgrading to a paid plan for higher limits
- Reduce the number of teams/leagues you're fetching

### Empty Data
- Check the API service status at [API-Football Status](https://www.api-football.com/)
- Verify the league codes and season numbers are correct
- Check the console for detailed error messages
