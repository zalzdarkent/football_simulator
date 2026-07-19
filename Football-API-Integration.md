# Football API Integration

This project now supports real football data from RapidAPI's live football data provider.

## Setup

### 1. Get API Key

1. Open your RapidAPI dashboard
2. Subscribe to the `free-api-live-football-data` provider
3. Copy your RapidAPI key

### 2. Configure Environment

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Add your API key to `.env`:
```
RAPIDAPI_FOOTBALL_KEY=your_actual_api_key_here
VITE_RAPIDAPI_FOOTBALL_KEY=your_actual_api_key_here
```

### 3. Fetch Real Data

Run the data fetching script to populate your database with real football data:

```bash
bun scripts/fetch-football-data.ts
```

This will fetch:
- Countries
- Leagues
- Teams built from fixtures
- Fixtures by date and league

The data will be saved to `src/data/` as JSON files:
- `countries-raw.json` - Raw country data
- `leagues-raw.json` - Raw league data
- `teams-raw.json` - Raw team data
- `fixtures-raw.json` - Raw fixture data

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

## Fixtures Calendar

The app now includes a fixtures calendar under the dashboard route. It reads from the local `fixtures` cache table and refreshes from RapidAPI when a date is missing or explicitly refreshed.

## API Service

The API service is located at `src/lib/football-api.ts` and includes:

### Available Functions

```typescript
// Get teams by league
footballApi.getTeams(leagueCode, season)

// Get team by ID
footballApi.getTeam(teamId)

// Get leagues
footballApi.getLeagues()

// Get league by code
footballApi.getLeague(leagueCode)

// Get fixtures by date
footballApi.getFixturesByDate(date)

// Get fixtures for a league
footballApi.getFixturesByLeagueId(leagueId)
```

### Helper Functions

```typescript
// Convert API team data to app's Club format
convertApiTeamToClub(apiTeam, leagueCode)
```

## Rate Limits

Rate limits depend on your RapidAPI plan. The fetch scripts include small delays and the app caches fixtures in PostgreSQL to reduce repeated requests.

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

### Fixture Data
```typescript
{
  id: number;
  leagueId: number;
  matchDate: string;
  kickoffAt: string;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  statusId: number;
  statusText: string | null;
}
```

## Integration with Existing Data

The local database keeps the game state schema intact. Countries, leagues, clubs, competitions, and fixtures are synchronized into PostgreSQL and reused by the app through the API layer.

## Troubleshooting

### API Key Not Working
- Verify your API key is correct in `.env`
- Check if your RapidAPI subscription is active for the football provider
- Ensure the `x-api-host` and `x-api-key` values match your RapidAPI setup

### Rate Limit Errors
- Wait before making more requests
- Consider upgrading to a paid plan for higher limits
- Reduce the number of teams/leagues you're fetching

### Empty Data
- Check the RapidAPI provider status in your dashboard
- Verify the league IDs and date format are correct
- Check the console for detailed error messages
